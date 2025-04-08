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
  faGripLines,
  faPlay,
  faStop,
  faPlayCircle,
  faShieldAlt,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';

// 实际WebSocket连接类（用于连接到后端Shell服务）
class RealShellConnection {
  constructor(onMessage, onError, onClose) {
    this.onMessage = onMessage;
    this.onError = onError;
    this.onClose = onClose;
    this.websocket = null;
    this.connected = false;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.reconnectTimeout = null;
  }

  connect() {
    try {
      // 使用安全的WebSocket连接到后端Shell服务
      // 注意：需要在后端设置对应的WebSocket服务器
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'development' ? '8080' : window.location.port;
      const wsUrl = `${protocol}//${host}:${port}/api/shell`;
      
      this.onMessage('正在连接到Shell服务...');
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        this.connected = true;
        this.retryCount = 0;
        this.onMessage('连接成功! 安全隧道已建立');
        this.onMessage('当前Shell会话为安全沙箱环境，命令执行受限。');
        this.onMessage('输入 help 查看可用命令');
      };
      
      this.websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'output') {
            this.onMessage(data.content);
          } else if (data.type === 'error') {
            this.onError(data.content);
          }
        } catch (e) {
          // 如果不是JSON格式，直接显示消息
          this.onMessage(event.data);
        }
      };
      
      this.websocket.onerror = (error) => {
        console.error('WebSocket错误:', error);
        this.onError('连接错误：无法连接到Shell服务');
        this.reconnect();
      };
      
      this.websocket.onclose = () => {
        this.connected = false;
        this.onClose('Shell连接已关闭');
        
        // 只有当不是手动关闭的情况下才尝试重连
        if (this.shouldReconnect) {
          this.reconnect();
        }
      };
    } catch (error) {
      console.error('WebSocket初始化错误:', error);
      this.onError(`连接初始化失败: ${error.message}`);
    }
  }

  // 尝试重新连接
  reconnect() {
    if (this.retryCount >= this.maxRetries) {
      this.onError(`连接失败，已尝试${this.maxRetries}次`);
      return;
    }
    
    this.retryCount++;
    this.onMessage(`尝试重新连接(${this.retryCount}/${this.maxRetries})...`);
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 2000); // 2秒后重试
  }

  // 发送命令到Shell服务器
  send(command) {
    if (!this.connected || !this.websocket) {
      this.onError('未连接到Shell服务');
      return;
    }
    
    try {
      this.websocket.send(JSON.stringify({
        type: 'command',
        content: command
      }));
    } catch (error) {
      console.error('发送命令错误:', error);
      this.onError(`发送命令失败: ${error.message}`);
    }
  }

  // 断开连接
  disconnect() {
    this.shouldReconnect = false; // 标记为手动断开，不自动重连
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.websocket) {
      // 先发送退出命令
      try {
        this.websocket.send(JSON.stringify({
          type: 'command',
          content: 'exit'
        }));
      } catch (e) {
        // 忽略退出时的发送错误
      }
      
      // 关闭WebSocket连接
      try {
        this.websocket.close();
      } catch (e) {
        console.error('关闭WebSocket连接错误:', e);
      }
      
      this.websocket = null;
      this.connected = false;
    }
  }
}

// 如果后端WebSocket服务尚未实现，使用模拟服务（后端开发完成后应移除）
function createShellConnection(onMessage, onError, onClose) {
  // 判断后端服务是否可用
  const checkBackendAvailable = () => {
    return fetch('/api/health')
      .then(response => response.ok)
      .catch(() => false);
  };
  
  return checkBackendAvailable()
    .then(isAvailable => {
      if (isAvailable) {
        // 使用真实连接
        return new RealShellConnection(onMessage, onError, onClose);
      } else {
        // 使用模拟连接（在生产环境中应移除）
        onMessage('注意: 使用的是模拟Shell环境，命令并未实际执行');
        
        // 模拟实现
        class MockShellConnection {
          constructor() {
            this.connected = false;
            this.onMessage = onMessage;
            this.onError = onError;
            this.onClose = onClose;
          }
          
          connect() {
            this.connected = true;
            this.onMessage('模拟Shell已连接 (后端服务未就绪)');
            this.onMessage('这是一个模拟环境，可执行基本的Linux命令演示');
          }
          
          send(command) {
            if (!this.connected) {
              this.onError('未连接到Shell服务');
              return;
            }
            
            // 基本命令模拟
            setTimeout(() => {
              if (command === 'ls') {
                this.onMessage('Documents\nDownloads\nPictures\nVideos\nprojects');
              } else if (command === 'pwd') {
                this.onMessage('/home/user');
              } else if (command === 'whoami') {
                this.onMessage('user');
              } else if (command === 'cat /etc/passwd') {
                this.onMessage('权限不足: 无法读取敏感文件');
              } else if (command === 'help') {
                this.onMessage('可用命令示例:\nls - 列出文件\npwd - 显示当前目录\nwhoami - 显示当前用户\nexit - 断开连接');
              } else if (command === 'exit') {
                this.onMessage('断开连接...');
                this.disconnect();
              } else if (command.startsWith('echo ')) {
                this.onMessage(command.substring(5));
              } else {
                this.onMessage(`命令 '${command}' 未找到或未实现`);
              }
            }, 300);
          }
          
          disconnect() {
            this.connected = false;
            this.onClose('模拟Shell连接已关闭');
          }
        }
        
        return new MockShellConnection();
      }
    });
}

function Knowledge() {
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalInput, setTerminalInput] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(288); // 72 * 4 = 288px (h-72)
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const startHeight = useRef(0);
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);
  const shellConnectionRef = useRef(null);
  const [shellActive, setShellActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'output', content: '欢迎使用 ReLum 安全实验终端!' },
    { type: 'output', content: '输入 help 查看可用命令' },
  ]);

  // 自动滚动到终端底部
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory]);

  // 自动聚焦输入框
  useEffect(() => {
    if (showTerminal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showTerminal]);

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      if (shellConnectionRef.current) {
        shellConnectionRef.current.disconnect();
      }
    };
  }, []);

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

  // 连接本地Shell
  const connectShell = () => {
    if (shellActive || isConnecting) return;
    
    setIsConnecting(true);
    setTerminalHistory(prev => [...prev, { type: 'output', content: '正在尝试连接到Shell服务...' }]);
    
    // 创建适当的Shell连接（真实或模拟）
    createShellConnection(
      // 收到消息
      (message) => {
        setTerminalHistory(prev => [...prev, { type: 'output', content: message }]);
      },
      // 错误处理
      (error) => {
        setTerminalHistory(prev => [...prev, { type: 'output', content: error, error: true }]);
        setIsConnecting(false);
      },
      // 连接关闭
      (message) => {
        setTerminalHistory(prev => [...prev, { type: 'output', content: message }]);
        setShellActive(false);
        setIsConnecting(false);
      }
    ).then(connection => {
      shellConnectionRef.current = connection;
      connection.connect();
      setShellActive(true);
      setIsConnecting(false);
    }).catch(error => {
      setTerminalHistory(prev => [...prev, { 
        type: 'output', 
        content: `Shell连接初始化失败: ${error.message}`, 
        error: true 
      }]);
      setIsConnecting(false);
    });
  };
  
  // 断开Shell连接
  const disconnectShell = () => {
    if (!shellActive || !shellConnectionRef.current) return;
    
    shellConnectionRef.current.disconnect();
    shellConnectionRef.current = null;
  };

  // 处理命令提交
  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;

    // 添加用户输入到历史记录
    setTerminalHistory([...terminalHistory, { type: 'input', content: terminalInput }]);
    
    // 如果Shell连接活跃，发送命令到Shell
    if (shellActive && shellConnectionRef.current) {
      // 特殊处理clear命令
      if (terminalInput.trim().toLowerCase() === 'clear') {
        // 清空历史记录，只保留一个清除成功的消息
        setTimeout(() => {
          setTerminalHistory([
            { type: 'output', content: '终端已清除' },
          ]);
        }, 100);
      }
      // 无论如何都发送到shell，让服务器也能处理
      shellConnectionRef.current.send(terminalInput);
    } else {
      // 否则使用本地模拟命令处理
      if (terminalInput.toLowerCase() === 'help') {
        setTerminalHistory(prev => [...prev, { 
          type: 'output', 
          content: '可用命令:\n- help: 显示帮助信息\n- clear: 清除终端\n- sql: 显示 SQL 注入命令示例\n- xss: 显示 XSS 攻击示例\n- shell: 连接到本地Shell（安全沙箱环境）' 
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
      } else if (terminalInput.toLowerCase() === 'shell') {
        connectShell();
      } else {
        setTerminalHistory(prev => [...prev, { 
          type: 'output', 
          content: `未知命令: ${terminalInput}. 输入 help 查看可用命令。` 
        }]);
      }
    }
    
    // 清空输入框
    setTerminalInput('');
  };

  // 处理终端点击事件，聚焦输入
  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
            
            {/* Shell控制按钮 */}
            {isConnecting ? (
              <div className="ml-4 bg-yellow-600 text-white text-xs px-2 py-1 rounded flex items-center">
                <FontAwesomeIcon icon={faSpinner} className="mr-1 animate-spin" />
                正在连接...
              </div>
            ) : shellActive ? (
              <button 
                className="ml-4 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex items-center"
                onClick={disconnectShell}
              >
                <FontAwesomeIcon icon={faStop} className="mr-1" />
                断开Shell
              </button>
            ) : (
              <button 
                className="ml-4 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded flex items-center"
                onClick={connectShell}
              >
                <FontAwesomeIcon icon={faPlayCircle} className="mr-1" />
                连接Shell
              </button>
            )}
            
            {shellActive && (
              <div className="ml-2 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-1"></div>
                <span className="text-green-400 text-xs">已连接</span>
              </div>
            )}
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
        
        <div 
          className="flex-1 p-3 overflow-y-auto font-mono text-sm text-gray-300 bg-[#1E1E1E]"
          onClick={handleTerminalClick}
        >
          {terminalHistory.map((entry, index) => (
            <div key={index} className={`mb-1 ${entry.type === 'input' ? 'text-gray-300' : entry.error ? 'text-red-400' : 'text-green-400'}`}>
              {entry.type === 'input' ? (
                <div className="font-mono text-sm tracking-wide">
                  <span className="text-primary mr-1">$</span> {entry.content}
                </div>
              ) : (
                <div className="font-mono text-sm tracking-wide" style={{ whiteSpace: 'pre-line' }}>{entry.content}</div>
              )}
            </div>
          ))}

          {/* 当前输入行 */}
          <form onSubmit={handleTerminalSubmit} className="flex items-start mb-1">
            <span className="text-primary mr-2 font-mono">$</span>
            <input
              ref={inputRef}
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              className="flex-1 bg-transparent outline-none text-white font-mono text-sm tracking-wide border-none p-0 m-0"
              autoFocus
            />
          </form>
          <div ref={terminalEndRef} />
        </div>
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