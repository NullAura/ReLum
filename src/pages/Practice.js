import React from 'react';
import TerminalFeature from '../components/TerminalPanel';

function Practice() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-8 relative">
      <TerminalFeature />
      
      <div className="bg-[#222222] rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-4">网络安全实践平台</h1>
        <p className="text-gray-400 mb-6">在这里，您可以通过动手实践来提升网络安全技能。</p>
        <div className="text-center py-12">
          <p className="text-xl text-gray-400">练习页面内容正在开发中...</p>
        </div>
      </div>
    </main>
  );
}

export default Practice; 