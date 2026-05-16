"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavBarProps {
  mobile?: boolean;
}

export default function NavBar({ mobile = false }: NavBarProps) {
  const pathname = usePathname();

  const links = [
    { href: mobile ? "/m" : "/", label: "거시지표" },
    { href: "/calendar", label: "캘린더" },
  ];

  return (
    <nav className="flex gap-1">
      {links.map(({ href, label }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
              isActive
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
