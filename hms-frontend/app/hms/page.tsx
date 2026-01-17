export default function HmsDashboardPage() {
  return (
    <div className="page">
      <div className="breadcrumb">
        <span>HMS</span>
        <span>/</span>
        <span>Dashboard</span>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3>City Overview</h3>
          <p>Monitor all onboarded cities, module enablement, and admins.</p>
          <div className="badge">Executive</div>
        </div>
        <div className="card">
          <h3>Actions</h3>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>Create city (POST /hms/cities)</li>
            <li>Enable/Disable modules per city</li>
            <li>Create city admin credentials</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
