import { motion } from "framer-motion";
import { Sparkles, Menu, X, Rss, Bell, BarChart3, Search, Users, Flame, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    Notifications
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stay updated with the latest AI newsletters
                  </p>
                </div>
                <div className="p-2">
                  <button
                    className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/newsletters');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Rss className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          New Newsletters Available
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Check out the latest AI weekly digests
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Updated weekly
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                  <button
                    className="w-full p-3 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/trends');
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                        <Flame className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium group-hover:text-primary transition-colors">
                          Trending Topics
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          See what's trending in AI research
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Real-time updates
                        </p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                </div>
                <div className="p-2 border-t border-border">
                  <Button 
                    variant="ghost" 
                    className="w-full justify-center text-sm"
                    onClick={() => {
                      setNotificationOpen(false);
                      navigate('/coming-soon');
                    }}
                  >
                    Enable Email Notifications
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
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
