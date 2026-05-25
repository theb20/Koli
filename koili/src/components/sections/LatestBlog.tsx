import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { BLOG_POSTS } from '../../constants/blogPosts'

export function LatestBlog() {
  return (
    <section className="bg-white py-12">
      <div className="max-w-7xl mx-auto px-6">

        <div className="flex flex-col items-center mb-8">
          <h2 className="text-2xl font-black text-[#151515]">Latest Blog</h2>
          <div className="w-12 h-0.5 bg-[#3b9c3c] rounded-full mt-2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {BLOG_POSTS.map((post) => (
            <Link
              key={post.id}
              to={post.href}
              className="group block bg-white border border-[#e0e0e0] rounded-2xl overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Image */}
              <div className="bg-[#f5f5f5] flex items-center justify-center h-44 overflow-hidden">
                <span
                  className="select-none group-hover:scale-110 transition-transform duration-500"
                  style={{ fontSize: '72px', lineHeight: 1 }}
                >
                  {post.emoji}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold bg-[#e8f5e9] text-[#3b9c3c] px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    {post.category}
                  </span>
                  <span className="text-[11px] text-[#ababab]">{post.date}</span>
                </div>
                <h3 className="text-sm font-bold text-[#151515] line-clamp-2 group-hover:text-[#3b9c3c] transition-colors leading-snug">
                  {post.title}
                </h3>
                <div className="flex items-center gap-1 mt-3 text-xs font-semibold text-[#3b9c3c]">
                  Read more <ArrowRight size={13} />
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  )
}
