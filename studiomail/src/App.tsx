import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProjectsPage from './pages/ProjectsPage'
import EditorPage from './pages/EditorPage'

// Même préfixe que vite.config.ts (base: '/studio-mail/' en production) —
// import.meta.env.BASE_URL vaut '/' en dev, '/studio-mail/' en prod, donc
// ce composant n'a rien à distinguer lui-même.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <Routes>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/editor/:projectId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  )
}
