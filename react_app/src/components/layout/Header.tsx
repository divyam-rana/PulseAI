import { motion } from "framer-motion";
import { Sparkles, Menu, X, Rss, Bell, BarChart3, Search, Users, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="fixed top-0 left-0 right-0 z-50 bg-glass border-b border-border/50"
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <motion.div whileHover={{ scale: 1.02 }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-primary blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                  <div className="relative bg-gradient-primary p-2 rounded-xl">
                    <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 text-primary-foreground" />
                  </div>
                </div>
              </motion.div>
              <span className="font-display text-xl lg:text-2xl font-bold text-gradient">
                PulseAI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link
              to="/newsletters"
              className={`text-sm lg:text-base transition-colors ${
                location.pathname === "/newsletters" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Rss className="w-4 h-4" />
                Newsletters
              </div>
            </Link>
            <Link
              to="/search"
              className={`text-sm lg:text-base transition-colors ${
                location.pathname === "/search" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search
              </div>
            </Link>
            <Link
              to="/analytics"
              className={`text-sm lg:text-base transition-colors ${
                location.pathname === "/analytics" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Analytics
              </div>
            </Link>
            <Link
              to="/trends"
              className={`text-sm lg:text-base transition-colors ${
                location.pathname === "/trends" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4" />
                Trends
              </div>
            </Link>
            <Link
              to="/team"
              className={`text-sm lg:text-base transition-colors ${
                location.pathname === "/team" ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Team
              </div>
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            </Button>
            <Link to="/coming-soon">
              <Button variant="hero" size="sm">
                Subscribe
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-border/50 py-4"
          >
            <nav className="flex flex-col gap-3">
              <Link
                to="/newsletters"
                className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Rss className="w-4 h-4" />
                Newsletters
              </Link>
              <Link
                to="/search"
                className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Search className="w-4 h-4" />
                Search
              </Link>
              <Link
                to="/analytics"
                className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Link>
              <Link
                to="/trends"
                className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Flame className="w-4 h-4" />
                Trends
              </Link>
              <Link
                to="/team"
                className="text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Users className="w-4 h-4" />
                Team
              </Link>
              <div className="flex gap-3 pt-4 border-t border-border/50">
                <ThemeToggle />
                <Link to="/coming-soon" className="flex-1">
                  <Button variant="hero" size="sm" className="w-full">
                    Subscribe
                  </Button>
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
}
