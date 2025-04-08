import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faDatabase, 
  faCode, 
  faPaperPlane, 
  faUpload,
  faDownload,
  faTerminal,
  faFile,
  faFileCode,
  faExchangeAlt,
  faServer,
  faPuzzlePiece,
  faLayerGroup,
  faGlobe,
  faHdd,
  faBrain,
  faRobot,
  faComments,
  faTimes,
  faChevronUp,
  faChevronDown,
  faCircle,
  faGripLines
} from '@fortawesome/free-solid-svg-icons';

function Knowledge() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(288); // 72 * 4 = 288px (h-72)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', content: '欢迎使用 ReLum 安全实验终端!' },
    { type: 'output', content: '输入 help 查看可用命令' },
  ]);

  // 处理拖拽开始
  const handleDragStart = (e) => {
    e.preventDefault();
    dragStartY.current = e.clientY;
    startHeight.current = terminalHeight;
    setIsDragging(true);
  };

  // 处理拖拽移动
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // 计算新高度 (向上拖动增加高度)
      const delta = dragStartY.current - e.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.8, startHeight.current + delta));
      setTerminalHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    // 添加用户输入到历史记录
    setTerminalHistory([...terminalHistory, { type: 'input', content: terminalInput }]);
    
    // 处理命令
    if (terminalInput.toLowerCase() === 'help') {
      setTerminalHistory(prev => [...prev, { 
        type: 'output', 
        content: '可用命令:\n- help: 显示帮助信息\n- clear: 清除终端\n- sql: 显示 SQL 注入命令示例\n- xss: 显示 XSS 攻击示例' 
      }]);
    } else if (terminalInput.toLowerCase() === 'clear') {
      setTerminalHistory([
        { type: 'output', content: '终端已清除' },
      ]);
    } else if (terminalInput.toLowerCase() === 'sql') {
      setTerminalHistory(prev => [...prev, { 
        type: 'output', 
        content: 'SQL 注入示例:\n- 1\' OR \'1\'=\'1\n- admin\' --\n- 1\' UNION SELECT 1,2,3,4,5 --' 
      }]);
    } else if (terminalInput.toLowerCase() === 'xss') {
      setTerminalHistory(prev => [...prev, { 
        type: 'output', 
        content: 'XSS 攻击示例:\n- <script>alert(\'XSS\')</script>\n- <img src="x" onerror="alert(\'XSS\')">\n- javascript:alert(\'XSS\')' 
      }]);
    } else {
      setTerminalHistory(prev => [...prev, { 
        type: 'output', 
        content: `未知命令: ${terminalInput}. 输入 help 查看可用命令。` 
      }]);
    }
    
    // 清空输入框
    setTerminalInput('');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 py-8 relative">
      {/* 浮动工具图标 */}
      <div className="fixed right-8 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
        <button 
          className="bg-primary w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-all duration-200"
          onClick={() => setShowTerminal(prev => !prev)}
        >
          <FontAwesomeIcon icon={faTerminal} className="text-xl" />
        </button>
        <button className="bg-primary w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-all duration-200">
          <FontAwesomeIcon icon={faBrain} className="text-xl" />
        </button>
      </div>
      
      {/* 终端界面 */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-[#1E1E1E] shadow-lg transition-all duration-300 z-30 ${showTerminal ? '' : 'h-0'} overflow-hidden flex flex-col`} 
        style={{ height: showTerminal ? `${terminalHeight}px` : '0px' }}
      >
        {/* 拖拽手柄 */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 bg-primary cursor-ns-resize z-10 flex justify-center items-center"
          onMouseDown={handleDragStart}
        >
          <div className="w-20 h-1 bg-primary rounded-full"></div>
        </div>
        
        <div className="flex items-center justify-between bg-[#2D2D2D] p-2 border-b border-[#444]">
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium text-white">ReLum 安全实验终端</div>
            <FontAwesomeIcon icon={faGripLines} className="text-gray-500 ml-2 cursor-move" onMouseDown={handleDragStart} />
          </div>
          <div className="flex items-center space-x-2">
            <button className="text-gray-400 hover:text-white">
              <FontAwesomeIcon icon={showTerminal ? faChevronDown : faChevronUp} />
            </button>
            <button 
              className="text-gray-400 hover:text-white"
              onClick={() => setShowTerminal(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        </div>
        <div className="flex-1 p-3 overflow-y-auto font-mono text-sm text-gray-300 bg-[#1E1E1E]">
          {terminalHistory.map((entry, index) => (
            <div key={index} className={`mb-1 ${entry.type === 'input' ? 'text-gray-300' : 'text-green-400'}`}>
              {entry.type === 'input' ? (
                <div className="font-mono text-sm tracking-wide"><span className="text-primary">$</span> {entry.content}</div>
              ) : (
                <div className="font-mono text-sm tracking-wide" style={{ whiteSpace: 'pre-line' }}>{entry.content}</div>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleTerminalSubmit} className="flex items-center p-2 bg-[#1E1E1E] border-t border-[#444]">
          <span className="text-primary mr-2 font-mono">$</span>
          <input
            type="text"
            value={terminalInput}
            onChange={(e) => setTerminalInput(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white font-mono text-sm tracking-wide"
            placeholder="输入命令..."
            autoFocus
          />
        </form>
      </div>
      
      <div className="bg-[#222222] rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-4">网络安全知识库</h1>
        <p className="text-gray-400 mb-6">这里汇集了丰富的网络安全知识和学习资源。</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* SQL注入漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faDatabase} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">SQL注入漏洞</h2>
            <p className="text-gray-400 mb-4">利用SQL语句执行漏洞获取或操作数据库信息</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>字符型SQL注入</li>
              <li>数值型SQL注入</li>
              <li>联合注入</li>
              <li>报错注入</li>
              <li>布尔盲注</li>
              <li>时间盲注</li>
              <li>二阶注入</li>
              <li>绕过技术</li>
            </ul>
          </div>

          {/* 跨站脚本漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faCode} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">跨站脚本漏洞</h2>
            <p className="text-gray-400 mb-4">向网页注入恶意脚本，实现会话劫持等攻击</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>反射型跨站脚本</li>
              <li>存储型跨站脚本</li>
              <li>DOM型跨站脚本</li>
              <li>利用XSS平台获取Cookie</li>
            </ul>
          </div>

          {/* 跨站请求伪造漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faPaperPlane} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">跨站请求伪造漏洞</h2>
            <p className="text-gray-400 mb-4">诱导用户执行非本意的操作，利用已有的身份认证</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>GET型CSRF</li>
              <li>POST型CSRF</li>
              <li>CSRF漏洞POC改造</li>
              <li>CSRF绕过Referer检测</li>
            </ul>
          </div>

          {/* 任意文件上传漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faUpload} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">任意文件上传漏洞</h2>
            <p className="text-gray-400 mb-4">绕过文件上传限制，上传恶意文件执行代码</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>JavaScript校验绕过</li>
              <li>MIME类型检测绕过</li>
              <li>扩展名校验绕过</li>
              <li>文件内容检测绕过</li>
              <li>二次渲染绕过</li>
              <li>条件竞争绕过</li>
            </ul>
          </div>

          {/* 任意文件下载漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faDownload} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">任意文件下载漏洞</h2>
            <p className="text-gray-400 mb-4">利用漏洞获取服务器上的敏感文件和信息</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>路径遍历</li>
              <li>未授权文件任意下载</li>
              <li>敏感文件获取</li>
            </ul>
          </div>

          {/* 命令/代码执行漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faTerminal} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">命令/代码执行漏洞</h2>
            <p className="text-gray-400 mb-4">在目标系统上执行恶意命令或代码获取控制权</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>绕过字符串过滤限制</li>
              <li>无回显的命令执行</li>
              <li>利用命令/代码执行漏洞写木马</li>
              <li>反弹shell</li>
            </ul>
          </div>

          {/* 文件包含漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faFile} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">文件包含漏洞</h2>
            <p className="text-gray-400 mb-4">利用文件包含机制载入恶意文件或读取敏感信息</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>基础文件包含</li>
              <li>敏感文件读取</li>
              <li>日志文件包含</li>
              <li>SESSION文件包含</li>
              <li>伪协议实现文件读取和代码执行</li>
              <li>任意目录遍历</li>
              <li>00截断绕过</li>
            </ul>
          </div>

          {/* XML外部实体注入漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faFileCode} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">XML外部实体注入漏洞</h2>
            <p className="text-gray-400 mb-4">利用XML解析器处理外部实体引用的特性进行攻击</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>有回显的XXE</li>
              <li>无回显的XXE</li>
            </ul>
          </div>

          {/* 业务逻辑漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faExchangeAlt} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">业务逻辑漏洞</h2>
            <p className="text-gray-400 mb-4">利用应用业务流程中的设计缺陷进行攻击</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>用户名遍历</li>
              <li>重放攻击</li>
              <li>验证码复用</li>
              <li>支付逻辑</li>
              <li>水平越权</li>
              <li>垂直越权</li>
              <li>未授权访问</li>
              <li>登录认证绕过</li>
              <li>密码重置</li>
              <li>空口令</li>
            </ul>
          </div>

          {/* 中间件漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faServer} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">中间件漏洞</h2>
            <p className="text-gray-400 mb-4">攻击各类应用服务器中间件的安全漏洞</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>Weblogic多种典型漏洞利用</li>
              <li>Tomcat典型漏洞利用</li>
              <li>Jboss典型漏洞利用</li>
            </ul>
          </div>

          {/* 组件漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faPuzzlePiece} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">组件漏洞</h2>
            <p className="text-gray-400 mb-4">利用常见开发组件中的漏洞进行攻击</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>Shiro组件典型漏洞利用</li>
              <li>Fastjson典型漏洞利用</li>
              <li>Log4j典型漏洞利用</li>
            </ul>
          </div>

          {/* 第三方框架漏洞 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faLayerGroup} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">第三方框架漏洞</h2>
            <p className="text-gray-400 mb-4">针对流行开发框架中的安全漏洞利用</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>Thinkphp多种典型漏洞利用</li>
              <li>Struts2多种典型漏洞利用</li>
              <li>Spring框架典型漏洞利用</li>
              <li>若依框架典型漏洞利用</li>
            </ul>
          </div>

          {/* CMS漏洞利用实战 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faGlobe} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">CMS漏洞利用实战</h2>
            <p className="text-gray-400 mb-4">常见内容管理系统的漏洞利用技术</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>Wordpress多种典型漏洞利用</li>
              <li>其他常见CMS典型漏洞利用</li>
            </ul>
          </div>

          {/* 数据库漏洞利用实战 */}
          <div className="bg-[#2A2A2A] rounded-lg p-5 hover:bg-[#333333] transition-colors duration-200">
            <FontAwesomeIcon icon={faHdd} className="text-primary text-2xl mb-3" />
            <h2 className="text-xl font-semibold mb-2">数据库漏洞利用实战</h2>
            <p className="text-gray-400 mb-4">各类数据库系统的安全漏洞利用技术</p>
            <ul className="text-sm text-gray-400 space-y-1 ml-4 list-disc">
              <li>MySQL典型漏洞利用</li>
              <li>Redis典型漏洞利用</li>
              <li>PostgreSQL典型漏洞利用</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}

export default Knowledge; 