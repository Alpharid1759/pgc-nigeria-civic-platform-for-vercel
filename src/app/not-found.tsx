import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap section">
      <h1>Page not found</h1>
      <p className="section__lead">The page you are looking for does not exist or has moved.</p>
      <p>
        <Link className="pgc-btn pgc-btn--primary" href="/">
          Back to home
        </Link>
      </p>
    </div>
  );
}
