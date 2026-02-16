export default function StatusBadge({ status }) {
    const styles = {
        active: "bg-green-100 text-green-700 border-green-300",
        idle: "bg-yellow-100 text-yellow-700 border-yellow-300",
    };

    const labels = {
        active: "active",
        idle: "idle",
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
