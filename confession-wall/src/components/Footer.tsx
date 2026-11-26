import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-zinc-900 py-8 text-center text-xs text-zinc-500">
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
        <p>
          Confessions are anonymous. Moderated &amp; reacted to by{' '}
          <span className="text-zinc-400 font-medium">NVIDIA Nemotron</span>.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Wall
          </Link>
          <Link href="/admin" className="hover:text-zinc-300 transition-colors">
            Moderation
          </Link>
        </div>
      </div>
    </footer>
  );
}
