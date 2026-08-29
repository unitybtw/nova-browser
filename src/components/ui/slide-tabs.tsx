import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export interface SlideTabsProps {
  items?: string[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
  className?: string;
}

export const SlideTabs: React.FC<SlideTabsProps> = ({
  items = ["Home", "Pricing", "Features", "Docs", "Blog"],
  selectedIndex: controlledSelected,
  onSelect,
  className = "",
}) => {
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [internalSelected, setInternalSelected] = useState(0);
  const selected = controlledSelected !== undefined ? controlledSelected : internalSelected;
  const tabsRef = useRef<(HTMLLIElement | null)[]>([]);

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
  }, [selected, items]);

  const resetCursorToSelected = () => {
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
      onMouseLeave={resetCursorToSelected}
      className={`relative mx-auto flex w-fit items-center rounded-full border-2 border-black bg-white p-1 dark:border-white dark:bg-neutral-800 ${className}`}
    >
      {items.map((tab, i) => (
        <Tab
          key={tab}
          ref={(el) => {
            tabsRef.current[i] = el;
          }}
          setPosition={setPosition}
          onClick={() => {
            setInternalSelected(i);
            onSelect?.(i);
          }}
        >
          {tab}
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
  onClick?: () => void;
}

const Tab = React.forwardRef<HTMLLIElement, TabProps>(
  ({ children, setPosition, onClick }, ref) => {
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
        className="relative z-10 block cursor-pointer px-3 py-1.5 font-mono text-xs uppercase text-white mix-blend-difference md:px-5 md:py-3 md:text-sm select-none"
      >
        {children}
      </li>
    );
  }
);

Tab.displayName = "Tab";

interface CursorProps {
  position: { left: number; width: number; opacity: number };
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
      className="absolute z-0 h-7 rounded-full bg-black dark:bg-white md:h-10"
    />
  );
};

export default SlideTabs;
