export default function DbNotice({ what }: { what: string }) {
  return (
    <div className="empty-state" role="status">
      <strong>{what} are not available right now.</strong> This deployment is not connected to its database yet. Set
      DATABASE_URL (and PGC_SECRET for forms) and redeploy.
    </div>
  );
}
