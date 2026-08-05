import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import IomiNotch from "@/components/IomiNotch";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      {/* Landing here used to strand you: no navigation at all, and the only way out
          was a plain <a> that hard-reloaded the app, which reset Braino to asleep and
          made him replay the whole boot. The notch gives you a way out, and Link keeps
          it an in-app navigation so nothing resets. */}
      <IomiNotch />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link to="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
