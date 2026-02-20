import React, { useState } from 'react';

interface TabItem {
    label: string;
    content: React.ReactNode;
}

interface TabsProps {
    tabs: TabItem[];
}

export const Tabs: React.FC<TabsProps> = ({ tabs }) => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="w-full">
            {/* Tab Header */}
            <div className="border-b border-gray-200">
                <ul className="flex flex-wrap -mb-px text-sm font-medium text-center">
                    {tabs.map((tab, index) => (
                        <li className="mr-2" key={index}>
                            <button
                                onClick={() => setActiveTab(index)}
                                className={`inline-flex items-center justify-center p-4 border-b-2 rounded-t-lg transition-all duration-200 group
                  ${activeTab === index
                                        ? 'text-primary border-primary bg-primary/5'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <svg className={`w-4 h-4 mr-2 ${activeTab === index ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`}
                                    fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                </svg>
                                {tab.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Tab Content */}
            <div className="mt-6 animate-fade-in-up">
                {tabs[activeTab]?.content}
            </div>
        </div>
    );
};

export default Tabs;
