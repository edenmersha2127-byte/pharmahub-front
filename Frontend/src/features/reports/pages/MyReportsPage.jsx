import { Link } from "react-router-dom";
import { FlagIcon, SearchIcon } from "lucide-react";
import { getMyReports } from "@/features/reports/api/reportApi";
import ReportCard from "@/features/reports/components/ReportCard";
import { usePagedList } from "@/hooks/usePagedList";
import { PageHeader } from "@/components/common/PageBits";
import ListState from "@/components/common/ListState";
import Pagination from "@/components/common/Pagination";
import { ghostBtn } from "@/components/common/styles";
import { PATHS } from "@/router/routes";
import { shortId } from "@/lib/helpers/helpers";

/** Customer view of the reports they have filed against pharmacies. */
export default function MyReportsPage() {
  const list = usePagedList(getMyReports, { listKey: "reports", fallback: "Could not load your reports." });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="My Reports"
        subtitle="Issues you reported, the pharmacy's response and our decision."
      >
        <Link to={PATHS.CUSTOMER_SEARCH} className={ghostBtn}>
          <SearchIcon className="size-3.5" /> Find a pharmacy
        </Link>
      </PageHeader>

      <ListState
        loading={list.loading}
        error={list.error}
        isEmpty={list.items.length === 0}
        empty={{
          icon: FlagIcon,
          title: "You have not reported anything",
          subtitle: "If a pharmacy was closed, out of stock or charged a different price, use Report on its search result.",
        }}
      >
        <div className="flex flex-col gap-3">
          {list.items.map((r) => (
            <ReportCard key={r.id} report={r} heading={`Pharmacy ${shortId(r.pharmacyId)}`} />
          ))}
        </div>
      </ListState>

      <Pagination page={list.page} totalPages={list.meta.totalPages} loading={list.loading} onChange={list.setPage} />
    </div>
  );
}
