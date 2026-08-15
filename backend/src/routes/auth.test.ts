import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { prismaMock } from '../test/prismaMock'

vi.mock('../lib/prisma', () => ({ prisma: prismaMock }))

const verifyRecaptchaMock = vi.fn().mockResolvedValue(true)
vi.mock('../lib/recaptcha', () => ({ verifyRecaptcha: (...args: unknown[]) => verifyRecaptchaMock(...args) }))

const sendWelcomeEmailMock       = vi.fn().mockResolvedValue(undefined)
const sendMagicLinkEmailMock     = vi.fn().mockResolvedValue(undefined)
const sendPasswordResetEmailMock = vi.fn().mockResolvedValue(undefined)
vi.mock('../lib/mailer', () => ({
  sendWelcomeEmail:       (...args: unknown[]) => sendWelcomeEmailMock(...args),
  sendMagicLinkEmail:     (...args: unknown[]) => sendMagicLinkEmailMock(...args),
  sendPasswordResetEmail: (...args: unknown[]) => sendPasswordResetEmailMock(...args),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue(undefined),
  sendBroadcastEmail:       vi.fn().mockResolvedValue(undefined),
}))

import authRouter from './auth'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/auth', authRouter)
  return app
}

const BASE_USER = {
  id: 'user_cuid_1',
  prenom: 'Fred',
  nom: 'Test',
  email: 'fred@skignas.com',
  role: 'customer',
  avatar: null,
  twoFactorEnabled: false,
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
  naissance: new Date('2000-01-01'),
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyRecaptchaMock.mockResolvedValue(true)
  })

  it('rejette avec 403 si la vérification reCAPTCHA échoue, sans même chercher l\'utilisateur', async () => {
    verifyRecaptchaMock.mockResolvedValue(false)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'whatever123' })

    expect(res.status).toBe(403)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('renvoie un message générique quand l\'email n\'existe pas — pas d\'énumération de comptes', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: 'inconnu@skignas.com', password: 'whatever123' })

    expect(res.status).toBe(401)
    expect(res.body.message).toBe('Email ou mot de passe incorrect')
  })

  it('bloque une tentative même avec le bon mot de passe si le compte est déjà verrouillé', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...BASE_USER, password: hash, lockedUntil: new Date(Date.now() + 10 * 60_000),
    } as never)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'CorrectPass1' })

    expect(res.status).toBe(429)
    expect(prismaMock.user.update).not.toHaveBeenCalled()
  })

  it('verrouille le compte au 3e échec consécutif (MAX_LOGIN_ATTEMPTS)', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...BASE_USER, password: hash, failedLoginAttempts: 2, lockedUntil: null,
    } as never)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'MauvaisMotDePasse' })

    expect(res.status).toBe(429)
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: BASE_USER.id },
      data: { failedLoginAttempts: 0, lockedUntil: expect.any(Date) },
    })
  })

  it('incrémente le compteur sans verrouiller avant le seuil', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...BASE_USER, password: hash, failedLoginAttempts: 0, lockedUntil: null,
    } as never)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'MauvaisMotDePasse' })

    expect(res.status).toBe(401)
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: BASE_USER.id },
      data: { failedLoginAttempts: 1, lockedUntil: null },
    })
  })

  it('connecte avec succès et émet une session quand tout est correct', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10)
    prismaMock.user.findUnique.mockResolvedValue({ ...BASE_USER, password: hash } as never)
    prismaMock.session.create.mockResolvedValue({} as never)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'CorrectPass1' })

    expect(res.status).toBe(200)
    expect(res.body.data.accessToken).toBeTruthy()
    expect(res.body.data.user.email).toBe(BASE_USER.email)
    expect(prismaMock.session.create).toHaveBeenCalled()
  })

  it('renvoie un tempToken sans créer de session quand la 2FA est activée', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10)
    prismaMock.user.findUnique.mockResolvedValue({ ...BASE_USER, password: hash, twoFactorEnabled: true } as never)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'CorrectPass1' })

    expect(res.status).toBe(200)
    expect(res.body.data.requires2FA).toBe(true)
    expect(res.body.data.tempToken).toBeTruthy()
    expect(prismaMock.session.create).not.toHaveBeenCalled()
  })

  it('refuse l\'accès à un compte de moins de 18 ans', async () => {
    const hash = await bcrypt.hash('CorrectPass1', 10)
    prismaMock.user.findUnique.mockResolvedValue({
      ...BASE_USER, password: hash, naissance: new Date(Date.now() - 10 * 365 * 24 * 3600 * 1000), // ~10 ans
    } as never)

    const res = await request(buildApp())
      .post('/api/auth/login')
      .send({ email: BASE_USER.email, password: 'CorrectPass1' })

    expect(res.status).toBe(403)
  })
})

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyRecaptchaMock.mockResolvedValue(true)
  })

  const VALID_BODY = {
    prenom: 'Fred', nom: 'Test', email: 'nouveau@skignas.com',
    password: 'CorrectPass1', naissance: '2000-01-01',
  }

  it('rejette avec 403 si la vérification reCAPTCHA échoue, sans créer de compte', async () => {
    verifyRecaptchaMock.mockResolvedValue(false)

    const res = await request(buildApp()).post('/api/auth/register').send(VALID_BODY)

    expect(res.status).toBe(403)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('rejette une inscription avec moins de 18 ans avant même d\'appeler la base — validation Zod', async () => {
    const res = await request(buildApp())
      .post('/api/auth/register')
      .send({ ...VALID_BODY, naissance: '2015-01-01' })

    expect(res.status).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('rejette un mot de passe trop faible avant d\'appeler la base — validation Zod', async () => {
    const res = await request(buildApp())
      .post('/api/auth/register')
      .send({ ...VALID_BODY, password: 'faible' })

    expect(res.status).toBe(400)
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled()
  })

  it('refuse la création si l\'email existe déjà', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...BASE_USER, email: VALID_BODY.email } as never)

    const res = await request(buildApp()).post('/api/auth/register').send(VALID_BODY)

    expect(res.status).toBe(409)
    expect(prismaMock.user.create).not.toHaveBeenCalled()
  })

  it('crée le compte, hash le mot de passe, et connecte immédiatement en mode classique', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ ...BASE_USER, email: VALID_BODY.email, password: 'hashed' } as never)
    prismaMock.session.create.mockResolvedValue({} as never)

    const res = await request(buildApp()).post('/api/auth/register').send(VALID_BODY)

    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toBeTruthy()

    const createCall = prismaMock.user.create.mock.calls[0]![0] as { data: { password: string; hasPassword: boolean } }
    expect(createCall.data.hasPassword).toBe(true)
    expect(createCall.data.password).not.toBe(VALID_BODY.password) // jamais en clair
    expect(await bcrypt.compare(VALID_BODY.password, createCall.data.password)).toBe(true)

    expect(sendWelcomeEmailMock).toHaveBeenCalled()
  })

  it('inscription sans mot de passe : envoie un magic link et ne connecte pas immédiatement', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue({ ...BASE_USER, email: VALID_BODY.email } as never)
    prismaMock.user.update.mockResolvedValue({} as never)

    const { password: _drop, ...bodyWithoutPassword } = VALID_BODY
    const res = await request(buildApp()).post('/api/auth/register').send(bodyWithoutPassword)

    expect(res.status).toBe(201)
    expect(res.body.passwordless).toBe(true)
    expect(res.body.data).toBeUndefined()
    expect(sendMagicLinkEmailMock).toHaveBeenCalled()

    const createCall = prismaMock.user.create.mock.calls[0]![0] as { data: { hasPassword: boolean } }
    expect(createCall.data.hasPassword).toBe(false)
  })
})
