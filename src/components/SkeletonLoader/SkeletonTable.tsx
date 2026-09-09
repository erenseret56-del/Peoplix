const SkeletonTable = () => {
    return (
        <div className="animate-pulse">
            <table className="w-full">
                <thead>
                    <tr className="bg-gray-100">
                        {Array.from({ length: 9 }).map((_, i) => (
                            <th key={i} className={`px-4 py-3 h-10 ${i === 0 ? 'rounded-l-full' : ''} ${i === 8 ? 'rounded-r-full' : ''}`}>
                                <div className="h-4 bg-gray-200 rounded w-20"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {Array.from({ length: 10 }).map((_, rowIndex) => (
                        <tr key={rowIndex}>
                            {Array.from({ length: 9 }).map((_, colIndex) => (
                                <td key={colIndex} className="px-4 py-4">
                                    <div className={`h-3 bg-gray-100 rounded ${colIndex === 0 ? 'w-24' : 'w-16'}`}></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SkeletonTable;