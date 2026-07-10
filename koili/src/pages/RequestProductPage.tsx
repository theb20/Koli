import { useState } from "react";
import {
  Search,
  Package,
  Upload,
  MapPin,
  Calendar,
  BadgeCent,
  Box,
  Send,
  Clock,
  CheckCircle2,
  User,
  Mail,
  Phone,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { PageMeta } from "../components/seo/PageMeta";
import { useAuth } from "../contexts/AuthContext";
import { API_BASE } from "../lib/api";

type FormState = {
  clientPrenom: string;
  clientNom: string;
  clientEmail: string;
  clientTelephone: string;
  productName: string;
  description: string;
  quantity: string;
  budget: string;
  deliveryAddress: string;
  desiredDate: string;
};

const EMPTY_FORM: FormState = {
  clientPrenom: "",
  clientNom: "",
  clientEmail: "",
  clientTelephone: "",
  productName: "",
  description: "",
  quantity: "",
  budget: "",
  deliveryAddress: "",
  desiredDate: "",
};

export default function RequestProductPage() {
  const { user } = useAuth();
  const [images, setImages] = useState<File[]>([]);
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY_FORM,
    clientPrenom: user?.prenom ?? "",
    clientNom: user?.nom ?? "",
    clientEmail: user?.email ?? "",
  }));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [sent, setSent] = useState(false);

  const set = (k: keyof FormState) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: "" }));
  };

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setImages(prev => [...prev, ...Array.from(e.target.files!)].slice(0, 4));
    e.target.value = "";
  };

  const removeImage = (name: string) => {
    setImages(prev => prev.filter(img => img.name !== name));
  };

  const validate = () => {
    const e: typeof errors = {};
    if (!form.clientPrenom.trim()) e.clientPrenom = "Champ requis";
    if (!form.clientNom.trim()) e.clientNom = "Champ requis";
    if (!form.clientEmail.trim()) e.clientEmail = "Champ requis";
    else if (!/\S+@\S+\.\S+/.test(form.clientEmail)) e.clientEmail = "Email invalide";
    if (!form.productName.trim()) e.productName = "Champ requis";
    if (!form.description.trim() || form.description.trim().length < 10) e.description = "Décrivez le produit (10 caractères minimum)";
    if (!form.deliveryAddress.trim()) e.deliveryAddress = "Champ requis";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      let imageUrls: string[] = [];
      if (images.length > 0) {
        const fd = new FormData();
        images.forEach(img => fd.append("images", img));
        const uploadRes = await fetch(`${API_BASE}/api/product-requests/upload-images`, {
          method: "POST",
          body: fd,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message ?? "Échec de l'envoi des images");
        imageUrls = uploadData.data.urls;
      }

      const res = await fetch(`${API_BASE}/api/product-requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPrenom: form.clientPrenom,
          clientNom: form.clientNom,
          clientEmail: form.clientEmail,
          clientTelephone: form.clientTelephone || undefined,
          productName: form.productName,
          description: form.description,
          images: imageUrls,
          quantity: form.quantity ? Number(form.quantity) : undefined,
          budget: form.budget ? Number(form.budget) : undefined,
          deliveryAddress: form.deliveryAddress,
          desiredDate: form.desiredDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Erreur lors de l'envoi de la demande");

      setSent(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erreur lors de l'envoi. Réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: keyof FormState) =>
    `w-full rounded-xl border py-3 pl-12 pr-4 outline-none transition focus:border-blue-500 ${
      errors[field] ? "border-red-300" : "border-slate-200"
    }`;

  return (
    <div className="min-h-screen bg-slate-50">
      <PageMeta
        title="Trouver un produit"
        description="Décrivez le produit que vous recherchez, notre équipe trouve le meilleur fournisseur, estime le prix et le délai de livraison."
        path="/demande"
      />

      {/* HEADER */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14">

          <div className="inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600">
            <Package className="mr-2 h-4 w-4" />
            Demande de sourcing
          </div>

          <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900">
            Trouver un produit
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-600">
            Décrivez le produit que vous recherchez.
            Notre équipe trouvera le meilleur fournisseur,
            estimera le prix final ainsi que le délai maximal
            de livraison.
          </p>
        </div>
      </section>

      {/* CONTENT */}

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-3">

        {/* FORM */}

        <div className="lg:col-span-2">

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">

            {sent ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-5">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-slate-900">Demande envoyée !</h2>
                <p className="mt-2 max-w-sm text-slate-500">
                  Notre équipe étudie votre demande et vous répondra par email sous 24 à 48h.
                </p>
                <button
                  onClick={() => { setSent(false); setForm(EMPTY_FORM); setImages([]); }}
                  className="mt-6 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Faire une nouvelle demande
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-semibold">
                  Nouvelle demande
                </h2>

                <p className="mt-2 text-slate-500">
                  Remplissez les informations ci-dessous.
                </p>

                <div className="mt-10 space-y-7">

                  {/* Contact */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-medium">Prénom</label>
                      <div className="relative">
                        <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input type="text" placeholder="Jean" value={form.clientPrenom}
                          onChange={e => set("clientPrenom")(e.target.value)}
                          className={inputCls("clientPrenom")} />
                      </div>
                      {errors.clientPrenom && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.clientPrenom}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block font-medium">Nom</label>
                      <div className="relative">
                        <User className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input type="text" placeholder="Dupont" value={form.clientNom}
                          onChange={e => set("clientNom")(e.target.value)}
                          className={inputCls("clientNom")} />
                      </div>
                      {errors.clientNom && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.clientNom}</p>}
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-medium">Email</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input type="email" placeholder="jean@exemple.com" value={form.clientEmail}
                          onChange={e => set("clientEmail")(e.target.value)}
                          className={inputCls("clientEmail")} />
                      </div>
                      {errors.clientEmail && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.clientEmail}</p>}
                    </div>
                    <div>
                      <label className="mb-2 block font-medium">Téléphone <span className="text-slate-400 font-normal">(optionnel)</span></label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
                        <input type="tel" placeholder="07 00 00 00 00" value={form.clientTelephone}
                          onChange={e => set("clientTelephone")(e.target.value)}
                          className={inputCls("clientTelephone")} />
                      </div>
                    </div>
                  </div>

                  {/* Produit */}

                  <div>

                    <label className="mb-2 block font-medium">
                      Nom du produit
                    </label>

                    <div className="relative">

                      <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400"/>

                      <input
                        type="text"
                        placeholder="Ex : iPhone 17 Pro Max"
                        value={form.productName}
                        onChange={e => set("productName")(e.target.value)}
                        className={inputCls("productName")}
                      />

                    </div>
                    {errors.productName && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.productName}</p>}

                  </div>

                  {/* Description */}

                  <div>

                    <label className="mb-2 block font-medium">
                      Description
                    </label>

                    <textarea
                      rows={5}
                      placeholder="Couleur, taille, modèle, référence..."
                      value={form.description}
                      onChange={e => set("description")(e.target.value)}
                      className={`w-full rounded-xl border p-4 outline-none transition focus:border-blue-500 ${errors.description ? "border-red-300" : "border-slate-200"}`}
                    />
                    {errors.description && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.description}</p>}

                  </div>

                  {/* Upload */}

                  <div>

                    <label className="mb-3 block font-medium">
                      Photos (optionnel — 4 maximum)
                    </label>

                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 py-10 transition hover:border-blue-500 hover:bg-blue-50">

                      <Upload className="mb-3 h-10 w-10 text-slate-400"/>

                      <p className="font-medium">
                        Cliquez pour ajouter des images
                      </p>

                      <span className="mt-1 text-sm text-slate-500">
                        PNG, JPG, WEBP, HEIC
                      </span>

                      <input
                        multiple
                        hidden
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/heic,image/heif,image/avif"
                        disabled={images.length >= 4}
                        onChange={handleImages}
                      />

                    </label>

                    {images.length > 0 && (

                      <div className="mt-4 flex flex-wrap gap-2">

                        {images.map((img) => (

                          <div
                            key={img.name}
                            className="flex items-center gap-2 rounded-full bg-slate-100 pl-4 pr-2 py-2 text-sm"
                          >
                            {img.name}
                            <button type="button" onClick={() => removeImage(img.name)}
                              className="p-0.5 rounded-full hover:bg-slate-200 text-slate-500">
                              <X size={13} />
                            </button>
                          </div>

                        ))}

                      </div>

                    )}

                  </div>

                  {/* Grid */}

                  <div className="grid gap-6 md:grid-cols-2">

                    <div>

                      <label className="mb-2 block font-medium">
                        Quantité <span className="text-slate-400 font-normal">(optionnel)</span>
                      </label>

                      <div className="relative">

                        <Box className="absolute left-4 top-4 h-5 w-5 text-slate-400"/>

                        <input
                          type="number"
                          min={1}
                          placeholder="100"
                          value={form.quantity}
                          onChange={e => set("quantity")(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 py-3 pl-12 outline-none focus:border-blue-500"
                        />

                      </div>

                    </div>

                    <div>

                      <label className="mb-2 block font-medium">
                        Budget <span className="text-slate-400 font-normal">(optionnel)</span>
                      </label>

                      <div className="relative">
                        <BadgeCent className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

                        <input
                          type="number"
                          min={1}
                          placeholder="50000 FCFA"
                          value={form.budget}
                          onChange={e => set("budget")(e.target.value)}
                          className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Adresse */}

                  <div>
                    <label className="mb-2 block font-medium">
                      Adresse de livraison
                    </label>

                    <div className="relative">
                      <MapPin className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

                      <input
                        type="text"
                        placeholder="Ville, adresse complète"
                        value={form.deliveryAddress}
                        onChange={e => set("deliveryAddress")(e.target.value)}
                        className={inputCls("deliveryAddress")}
                      />
                    </div>
                    {errors.deliveryAddress && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.deliveryAddress}</p>}
                  </div>

                  {/* Date */}

                  <div>
                    <label className="mb-2 block font-medium">
                      Date souhaitée <span className="text-slate-400 font-normal">(optionnel)</span>
                    </label>

                    <div className="relative">
                      <Calendar className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

                      <input
                        type="date"
                        value={form.desiredDate}
                        onChange={e => set("desiredDate")(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <p className="text-sm text-red-500 flex items-center gap-1.5"><AlertCircle size={14} />{submitError}</p>
                  )}

                  {/* Bouton */}

                  <div className="pt-4">
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      {submitting ? "Envoi en cours..." : "Envoyer ma demande"}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* SIDEBAR */}

        <div className="space-y-6">

          {/* Comment ça marche */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <h3 className="text-xl font-semibold">
              Comment ça marche ?
            </h3>

            <div className="mt-6 space-y-5">

              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Search className="h-5 w-5 text-blue-600" />
                </div>

                <div>
                  <h4 className="font-semibold">
                    Décrivez votre produit
                  </h4>

                  <p className="text-sm text-slate-500">
                    Donnez le maximum d'informations.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>

                <div>
                  <h4 className="font-semibold">
                    Recherche fournisseur
                  </h4>

                  <p className="text-sm text-slate-500">
                    Nous comparons plusieurs fournisseurs.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>

                <div>
                  <h4 className="font-semibold">
                    Réception de votre offre
                  </h4>

                  <p className="text-sm text-slate-500">
                    Vous recevez le prix, le délai et la disponibilité.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Informations */}

          <div className="rounded-3xl border bg-gradient-to-br from-blue-600 to-indigo-600 p-6 text-white">

            <h3 className="text-xl font-semibold">
              Pourquoi utiliser notre service ?
            </h3>

            <ul className="mt-5 space-y-3 text-sm text-blue-100">
              <li>✓ Fournisseurs vérifiés</li>
              <li>✓ Prix transparents</li>
              <li>✓ Estimation rapide</li>
              <li>✓ Délais garantis</li>
              <li>✓ Suivi jusqu'à la livraison</li>
            </ul>

          </div>

        </div>

      </section>

    </div>
  );
}
