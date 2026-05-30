import { Link } from "react-router-dom";
import { mockPosts } from "../api/mockData";
import { Heart, MessageCircle } from "lucide-react";

export default function Explore() {
    return (
        <div className="max-w-[935px] mx-auto">
            {/* Grid of posts */}
            <div className="grid grid-cols-3 gap-1">
                {mockPosts.map((post) => (
                    <Link
                        key={post.id}
                        to={`/post/${post.id}`}
                        className="aspect-square relative group overflow-hidden bg-gray-100 dark:bg-[#262626]"
                    >
                        <img
                            src={post.images[0]}
                            alt={post.caption}
                            className="w-full h-full object-cover"
                        />
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-2 font-semibold">
                                <Heart size={20} fill="white" />
                                <span>{post.likes.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <MessageCircle size={20} fill="white" />
                                <span>{post.comments.length}</span>
                            </div>
                        </div>
                    </Link>
                ))}
                {/* Duplicate for more content */}
                {mockPosts.map((post) => (
                    <Link
                        key={`dup-${post.id}`}
                        to={`/post/${post.id}`}
                        className="aspect-square relative group overflow-hidden bg-gray-100 dark:bg-[#262626]"
                    >
                        <img
                            src={post.images[0]}
                            alt={post.caption}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white">
                            <div className="flex items-center gap-2 font-semibold">
                                <Heart size={20} fill="white" />
                                <span>{post.likes.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2 font-semibold">
                                <MessageCircle size={20} fill="white" />
                                <span>{post.comments.length}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
