import { useState } from 'react';
import { Upload, CheckCircle, Sparkles } from 'lucide-react';

const CSVUpload = () => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
            setIsProcessing(true);
            // Simulate processing
            setTimeout(() => setIsProcessing(false), 2000);
        }
    };

    return (
        <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl p-8 border border-white/20">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                <Upload className="w-5 h-5 mr-2 text-blue-500" />
                Upload Expenses
            </h3>
            <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center">
                {!csvFile ? (
                    <div>
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-gray-700 font-semibold mb-2">Drop your CSV file here</p>
                        <p className="text-sm text-gray-500 mb-6">Credit card or bank statement</p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-semibold rounded-full text-white bg-gradient-to-r from-blue-500 to-purple-600 cursor-pointer shadow-lg"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            Choose File
                        </label>
                    </div>
                ) : (
                    <div>
                        <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-gray-900 font-semibold text-lg">{csvFile.name}</p>
                        <p className="text-sm text-gray-500 mt-2">
                            {isProcessing ? (
                                <span className="flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                                    Processing magic...
                                </span>
                            ) : (
                                <span className="text-green-600 font-medium">✨ Ready to analyze</span>
                            )}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CSVUpload;