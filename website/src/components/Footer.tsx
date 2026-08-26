const GITHUB_URL = 'https://github.com/unitybtw/nova-browser';
const RELEASES_URL = 'https://github.com/unitybtw/nova-browser/releases/latest';

export default function Footer() {
  return (
    <footer className="border-t border-white/8 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-faint md:flex-row">
        <div className="flex items-center gap-2.5">
          <img
            src="/nova-icon-transparent.png"
            alt=""
            width={20}
            height={20}
            className="h-5 w-5"
          />
          <span>Nova Browser — Free, open-source browser built with Electron &amp; React.</span>
        </div>

        <nav aria-label="Footer">
          <ul className="flex items-center gap-6">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-200 hover:text-foreground"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-200 hover:text-foreground"
              >
                Releases
              </a>
            </li>
            <li>
              <a
                href="#top"
                className="transition-colors duration-200 hover:text-foreground"
              >
                Back to top
              </a>
            </li>
          </ul>
        </nav>
      </div>

      <p className="mt-8 text-center text-xs text-faint">
        © {new Date().getFullYear()} Nova Browser Contributors
      </p>
    </footer>
  );
}
