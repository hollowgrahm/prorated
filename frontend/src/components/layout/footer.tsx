import Link from 'next/link'
import { Github, Twitter, Globe, BookOpen } from 'lucide-react'

const footerLinks = {
  product: [
    { name: 'Discover Pools', href: '/pools' },
    { name: 'Create Pool', href: '/pools/create' },
    { name: 'Projects', href: '/projects' },
  ],
  resources: [
    { name: 'Documentation', href: '#', icon: BookOpen },
    { name: 'GitHub', href: '#', icon: Github },
    { name: 'Twitter', href: '#', icon: Twitter },
  ],
  protocol: [
    { name: 'How it Works', href: '#' },
    { name: 'Security', href: '#' },
    { name: 'Governance', href: '#' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container max-w-screen-2xl py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary via-primary to-accent flex items-center justify-center">
                <span className="font-bold text-primary-foreground text-sm">P</span>
              </div>
              <span className="font-bold gradient-text">
                Prorated Protocol
              </span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Crowdfunding platform for launching tokens with integrated DEX, lending, and governance.
            </p>
            <div className="flex space-x-4">
              {footerLinks.resources.map((link) => {
                const Icon = link.icon
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="sr-only">{link.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Product */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Protocol */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Protocol</h3>
            <ul className="space-y-3">
              {footerLinks.protocol.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-2"
                  >
                    <span>{link.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-border/40 pt-8 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm text-muted-foreground">
            © 2024 Prorated Protocol. Built for the community.
          </div>
          <div className="flex space-x-6 mt-4 sm:mt-0">
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
