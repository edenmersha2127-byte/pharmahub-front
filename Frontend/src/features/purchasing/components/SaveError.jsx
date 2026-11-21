import { Link } from "react-router-dom";
import { PATHS } from "@/router/routes";

/**
 * Error banner for failed saves. `error` is the result of parseApiError(); when
 * the save was refused because the subscription has ended, it adds a link to
 * the plans page. Renders nothing when there is no error.
 */
export default function SaveError({ error }) {
  if (!error?.message) return null;
  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {error.message}
      {error.subscriptionRequired && (
        <Link to={PATHS.PHARMACY_SUBSCRIPTION} className="ml-1 font-semibold underline underline-offset-2">
          View plans
        </Link>
      )}
    </p>
  );
}
