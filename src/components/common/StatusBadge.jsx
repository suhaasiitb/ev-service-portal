export default function StatusBadge({ status }) {
    const styles = {
        active: "bg-green-100 text-green-700 border-green-300",
        idle: "bg-yellow-100 text-yellow-700 border-yellow-300",
        under_repair: "bg-orange-100 text-orange-700 border-orange-300",
        ready_to_deploy: "bg-blue-100 text-blue-700 border-blue-300",
    };

    const labels = {
        active: "active",
        idle: "idle",
        under_repair: "under repair",
        ready_to_deploy: "ready to deploy",
    };

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.idle
                }`}
        >
            {labels[status] || status}
        </span>
    );
}
