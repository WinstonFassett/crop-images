import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SunIcon, MoonIcon } from "lucide-react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Check initial theme on mount
  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains("dark") ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);

    // Update the DOM
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className=" flex bg-gray-500 items-center justify-center rounded-full bg-opacity-10 hover:bg-opacity-20"
            onClick={toggleTheme}
          >
            {theme === "dark" ? (
              <SunIcon className="h-6 w-6" />
            ) : (
              <MoonIcon className="h-6 w-6" />
            )}
            <span className="sr-only">
              {theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
