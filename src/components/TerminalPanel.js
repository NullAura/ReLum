import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTerminal,
  faBrain,
  faTimes,
  faChevronUp,
  faChevronDown,
  faGripLines,
  faPlayCircle,
  faStop,
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

function createShellConnection(onMessage, onError, onClose) {
  // 直接返回真实连接，不再使用模拟Shell
  return Promise.resolve(new RealShellConnection(onMessage, onError, onClose));
}

// 悬浮工具组件
export function FloatingTools({ onToggleTerminal }) {
  return (
    <div className="fixed right-8 top-1/2 transform -translate-y-1/2 flex flex-col gap-4 z-10">
      <button 
        className="bg-primary w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-all duration-200"
        onClick={onToggleTerminal}
      >
        <FontAwesomeIcon icon={faTerminal} className="text-xl" />
      </button>
      <button className="bg-primary w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary/90 transition-all duration-200">
        <FontAwesomeIcon icon={faBrain} className="text-xl" />
      </button>
    </div>
  );
}

// 终端面板组件
export function TerminalPanel({ showTerminal, setShowTerminal }) {
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
    
    // 创建Shell连接
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
      // 发送到shell
      shellConnectionRef.current.send(terminalInput);
    } else {
      // 未连接时只处理少数基本命令
      if (terminalInput.toLowerCase() === 'help') {
        setTerminalHistory(prev => [...prev, { 
          type: 'output', 
          content: '可用命令:\n- help: 显示帮助信息\n- clear: 清除终端\n- shell: 连接到Shell服务' 
        }]);
      } else if (terminalInput.toLowerCase() === 'clear') {
        setTerminalHistory([
          { type: 'output', content: '终端已清除' },
        ]);
      } else if (terminalInput.toLowerCase() === 'shell') {
        connectShell();
      } else {
        setTerminalHistory(prev => [...prev, { 
          type: 'output', 
          content: '请先连接到Shell服务。输入 shell 命令建立连接。' 
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
  );
}

// 导出一个组合组件，方便在页面中使用
export default function TerminalFeature() {
  const [showTerminal, setShowTerminal] = useState(false);
  
  return (
    <>
      <FloatingTools onToggleTerminal={() => setShowTerminal(prev => !prev)} />
      <TerminalPanel showTerminal={showTerminal} setShowTerminal={setShowTerminal} />
    </>
  );
} 