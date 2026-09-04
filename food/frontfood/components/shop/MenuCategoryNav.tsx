function slugify(label: string) {
  return "cat-" + label.toLowerCase().normalize("NFD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

export { slugify as menuCategorySlug };

export function MenuCategoryNav({ categories }: { categories: string[] }) {
  if (categories.length <= 1) return null;

  return (
    <div className="sticky top-[64px] z-30 -mx-5 border-b border-ink-950/8 bg-cream-100/95 px-5 py-3 backdrop-blur-sm sm:top-[72px] sm:-mx-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl gap-2 overflow-x-auto">
        {categories.map((cat) => (
          <a
            key={cat}
            href={`#${slugify(cat)}`}
            className="shrink-0 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-ink-950/70 shadow-sm transition-colors hover:text-accent"
          >
            {cat}
          </a>
        ))}
      </div>
    </div>
  );
}
