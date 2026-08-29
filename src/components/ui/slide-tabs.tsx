import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export interface SlideTabsProps {
  tabs?: { label: string; href?: string; onClick?: () => void }[] | string[];
  onTabChange?: (tab: string, index: number) => void;
  className?: string;
}

export const SlideTabs: React.FC<SlideTabsProps> = ({
  tabs = ["Home", "Pricing", "Features", "Docs", "Blog"],
  onTabChange,
  className = "",
}) => {
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  // State to track the currently selected tab, defaulting to the first tab (index 0)
  const [selected, setSelected] = useState(0);
  const tabsRef = useRef<(HTMLLIElement | null)[]>([]);

  const tabList = tabs.map((t) => (typeof t === "string" ? { label: t } : t));

  // This effect runs when the component mounts or when the selected tab changes.
  // It calculates the position of the selected tab and sets the cursor.
  useEffect(() => {
    const selectedTab = tabsRef.current[selected];
    if (selectedTab) {
      const { width } = selectedTab.getBoundingClientRect();
      setPosition({
        left: selectedTab.offsetLeft,
        width,
        opacity: 1,
      });
    }
  }, [selected, tabs]);

  const resetCursor = () => {
    const selectedTab = tabsRef.current[selected];
    if (selectedTab) {
      const { width } = selectedTab.getBoundingClientRect();
      setPosition({
        left: selectedTab.offsetLeft,
        width,
        opacity: 1,
      });
    }
  };

  return (
    <ul
      onMouseLeave={resetCursor}
      className={`relative mx-auto flex w-fit items-center rounded-full border-2 border-black bg-white p-1 dark:border-white dark:bg-neutral-800 ${className}`}
    >
      {tabList.map((tab, i) => (
        <Tab
          key={tab.label}
          ref={(el) => {
            tabsRef.current[i] = el;
          }}
          setPosition={setPosition}
          onClick={() => {
            setSelected(i);
            tab.onClick?.();
            onTabChange?.(tab.label, i);
          }}
          href={tab.href}
        >
          {tab.label}
        </Tab>
      ))}

      <Cursor position={position} />
    </ul>
  );
};

interface TabProps {
  children: React.ReactNode;
  setPosition: React.Dispatch<
    React.SetStateAction<{ left: number; width: number; opacity: number }>
  >;
  onClick: () => void;
  href?: string;
}

// The Tab component is wrapped in forwardRef to accept a ref from its parent.
const Tab = React.forwardRef<HTMLLIElement, TabProps>(
  ({ children, setPosition, onClick, href }, ref) => {
    const content = (
      <span className="relative z-10 block px-3 py-1.5 text-xs uppercase text-white mix-blend-difference md:px-5 md:py-3 md:text-base select-none">
        {children}
      </span>
    );

    return (
      <li
        ref={ref}
        onClick={onClick}
        onMouseEnter={() => {
          if (!ref || typeof ref === "function" || !ref.current) return;
          const { width } = ref.current.getBoundingClientRect();

          setPosition({
            left: ref.current.offsetLeft,
            width,
            opacity: 1,
          });
        }}
        className="relative z-10 block cursor-pointer"
      >
        {href ? (
          <a href={href} className="block no-underline">
            {content}
          </a>
        ) : (
          content
        )}
      </li>
    );
  }
);

Tab.displayName = "Tab";

interface CursorProps {
  position: {
    left: number;
    width: number;
    opacity: number;
  };
}

const Cursor: React.FC<CursorProps> = ({ position }) => {
  return (
    <motion.li
      animate={{
        ...position,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className="absolute z-0 h-7 rounded-full bg-black dark:bg-white md:h-12 pointer-events-none"
    />
  );
};

export default SlideTabs;
