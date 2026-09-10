import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-black text-brand-primary">404</h1>
      <h2 className="mt-4 text-2xl font-bold text-white">Page Not Found</h2>
      <p className="mt-2 text-slate-400 max-w-md">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-6 px-6 py-3 rounded-full bg-brand-primary text-white font-bold text-sm hover:bg-brand-primary/80 transition shadow-lg"
      >
        Back to Home
      </Link>
    </div>
  );
}
