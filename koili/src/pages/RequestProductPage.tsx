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
} from "lucide-react";

export default function RequestProductPage() {
  const [images, setImages] = useState<File[]>([]);

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setImages(Array.from(e.target.files));
  };

  return (
    <div className="min-h-screen bg-slate-50">
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

            <h2 className="text-2xl font-semibold">
              Nouvelle demande
            </h2>

            <p className="mt-2 text-slate-500">
              Remplissez les informations ci-dessous.
            </p>

            <div className="mt-10 space-y-7">

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
                    className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500"
                  />

                </div>

              </div>

              {/* Description */}

              <div>

                <label className="mb-2 block font-medium">
                  Description
                </label>

                <textarea
                  rows={5}
                  placeholder="Couleur, taille, modèle, référence..."
                  className="w-full rounded-xl border border-slate-200 p-4 outline-none transition focus:border-blue-500"
                />

              </div>

              {/* Upload */}

              <div>

                <label className="mb-3 block font-medium">
                  Photos (optionnel)
                </label>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 py-10 transition hover:border-blue-500 hover:bg-blue-50">

                  <Upload className="mb-3 h-10 w-10 text-slate-400"/>

                  <p className="font-medium">
                    Cliquez pour ajouter des images
                  </p>

                  <span className="mt-1 text-sm text-slate-500">
                    PNG, JPG, WEBP
                  </span>

                  <input
                    multiple
                    hidden
                    type="file"
                    onChange={handleImages}
                  />

                </label>

                {images.length > 0 && (

                  <div className="mt-4 flex flex-wrap gap-2">

                    {images.map((img) => (

                      <div
                        key={img.name}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm"
                      >
                        {img.name}
                      </div>

                    ))}

                  </div>

                )}

              </div>

              {/* Grid */}

              <div className="grid gap-6 md:grid-cols-2">

                <div>

                  <label className="mb-2 block font-medium">
                    Quantité
                  </label>

                  <div className="relative">

                    <Box className="absolute left-4 top-4 h-5 w-5 text-slate-400"/>

                    <input
                      type="number"
                      placeholder="100"
                      className="w-full rounded-xl border border-slate-200 py-3 pl-12 outline-none focus:border-blue-500"
                    />

                  </div>

                </div>

                <div>

                  <label className="mb-2 block font-medium">
                    Budget
                                      </label>

                  <div className="relative">
                    <BadgeCent className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

                    <input
                      type="number"
                      placeholder="1000 FCFA"
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
                    className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Date */}

              <div>
                <label className="mb-2 block font-medium">
                  Date souhaitée
                </label>

                <div className="relative">
                  <Calendar className="absolute left-4 top-4 h-5 w-5 text-slate-400" />

                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Bouton */}

              <div className="pt-4">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
                >
                  <Send className="h-5 w-5" />

                  Envoyer ma demande
                </button>
              </div>
            </div>
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