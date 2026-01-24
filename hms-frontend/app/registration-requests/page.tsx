import { Protected } from "@components/Guards";
import { RegistrationApi } from "@lib/apiClient";
import { approveRequest, rejectRequest } from "./actions";

export default async function RegistrationRequestsPage() {
  const data = await RegistrationApi.listRequests();

  return (
    <Protected>
      <div className="page">
        <h1>Registration Requests</h1>
        <div className="grid grid-2">
          {data.requests.length === 0 && <div className="muted">No requests.</div>}
          {data.requests.map((r) => (
            <div className="card" key={r.id}>
              <h3>{r.name}</h3>
              <p className="muted">{r.phone}</p>
              <p className="muted">City: {r.cityId}</p>
              <p className="muted">
                Zone: {r.zone || "-"} / Ward: {r.ward || "-"}
              </p>
              <p className="muted">Modules: {r.requestedModules.join(", ")}</p>
              <p className="muted">Status: {r.status}</p>
              {r.status === "PENDING" && (
                <div className="flex gap-2 mt-2">
                  <form
                    action={approveRequest.bind(null, r.id)}
                  >
                    <button className="btn btn-primary btn-sm" type="submit">
                      Approve
                    </button>
                  </form>
                  <form
                    action={rejectRequest.bind(null, r.id, undefined)}
                  >
                    <button className="btn btn-danger btn-sm" type="submit">
                      Reject
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Protected>
  );
}
