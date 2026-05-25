export interface BlogPost {
  id: string
  title: string
  category: string
  date: string
  emoji: string
  href: string
}

export const BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'Cosy Bright Office In Yellow And Grey Colors',
    category: 'Company News',
    date: 'February 19, 2025',
    emoji: '🏢',
    href: '/blog',
  },
  {
    id: '2',
    title: 'Traveller Visiting Ice Cave With Amazing Eye-catching Scenes',
    category: 'Social Media',
    date: 'October 8, 2025',
    emoji: '🧊',
    href: '/blog',
  },
  {
    id: '3',
    title: 'Loft Office With Vintage Decor For Creative Working',
    category: 'Company News',
    date: 'September 19, 2025',
    emoji: '🛋️',
    href: '/blog',
  },
  {
    id: '4',
    title: 'Stylish Kitchen And Dining Room With Functional Ideas',
    category: 'Lifestyle',
    date: 'October 8, 2025',
    emoji: '🍽️',
    href: '/blog',
  },
]
