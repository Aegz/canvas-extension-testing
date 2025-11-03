import './App.css';
import { useEffect, useRef, useState } from 'react';

function App() {
  // React refs for DOM elements
  const statusRef = useRef(null);
  const messageLogRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const messagesPerFrameRef = useRef(null);
  const frameVariabilityRef = useRef(null);
  const messageDiversityRef = useRef(null);

  // React state for status
  const [status, setStatus] = useState({ text: 'Simulation Stopped', className: 'status stopped' });
  const [logEntries, setLogEntries] = useState([]);

  // Clear log function
  const clearLog = () => {
    setLogEntries([{
      id: 'cleared',
      className: 'log-entry',
      content: '[Cleared] Message log cleared.'
    }]);
  };

  useEffect(() => {
    // Message simulation state
    let isRunning = false;
    let intervalId = null;
    let frameId = 1;
    let messageId = 1;

    // Message types that Canvas typically sends
    const messageTypes = [
        'ecs-component-update',
        'ecs-entity-created',
        'ecs-entity-destroyed', 
        'ecs-system-update',
        'render-update',
        'input-event',
        'camera-update',
        'selection-change',
        'tool-change',
        'collaboration-event',
        'layout-update',
        'animation-frame',
        'texture-update',
        'shader-update',
        'performance-metric'
    ];

    function getCurrentTimestamp() {
          return performance.now();
      }

      function generateMessage(type, frameId, additionalData = {}) {
          const message = {
              id: `msg-${messageId++}`,
              type: type,
              frameId: frameId,
              timestamp: getCurrentTimestamp(),
              receivedAt: Date.now(),
              ...additionalData
          };

          return message;
      }

      function sendFrameStart(frameId) {
          const message = generateMessage('canvas-frame-start', frameId, {
              sessionId: `session-${Date.now()}`,
              renderMode: 'webgl',
              viewport: { width: 1920, height: 1080 }
          });
          
          window.__CANVAS_BRIDGE__?.send('FRAME_EVENT', message);
          logMessage(message);
          return message;
      }

      function sendFrameEnd(frameId, startTime) {
          const endTime = getCurrentTimestamp();
          const message = generateMessage('canvas-frame-end', frameId, {
              duration: endTime - startTime,
              renderTime: Math.random() * 5 + 1, // 1-6ms
              entityCount: Math.floor(Math.random() * 100) + 50
          });
          
          window.__CANVAS_BRIDGE__?.send('FRAME_EVENT', message);
          logMessage(message);
          return message;
      }

      function sendRandomMessage(frameId) {
          const config = getConfig();
          const typeIndex = Math.floor(Math.random() * Math.min(config.messageDiversity, messageTypes.length));
          const type = messageTypes[typeIndex];
          
          // Generate realistic message data based on type
          let additionalData = {};
          
          switch(type) {
              case 'ecs-component-update':
                  additionalData = {
                      entityId: `entity-${Math.floor(Math.random() * 1000)}`,
                      componentType: ['Transform', 'Render', 'Input', 'Physics'][Math.floor(Math.random() * 4)],
                      componentData: { 
                          x: Math.random() * 1000, 
                          y: Math.random() * 1000,
                          rotation: Math.random() * 360
                      }
                  };
                  break;
              case 'ecs-entity-created':
                  additionalData = {
                      entityId: `entity-${Math.floor(Math.random() * 1000)}`,
                      components: ['Transform', 'Render']
                  };
                  break;
              case 'render-update':
                  additionalData = {
                      drawCalls: Math.floor(Math.random() * 50) + 10,
                      triangles: Math.floor(Math.random() * 10000) + 1000,
                      bufferUpdates: Math.floor(Math.random() * 20)
                  };
                  break;
              case 'input-event':
                  additionalData = {
                      eventType: ['mousedown', 'mouseup', 'mousemove', 'keydown'][Math.floor(Math.random() * 4)],
                      coordinates: { x: Math.random() * 1920, y: Math.random() * 1080 },
                      button: Math.floor(Math.random() * 3)
                  };
                  break;
              case 'performance-metric':
                  additionalData = {
                      fps: Math.floor(Math.random() * 60) + 30,
                      frameTime: Math.random() * 16 + 8,
                      memoryUsage: Math.floor(Math.random() * 100) + 50
                  };
                  break;
              default:
                  additionalData = {
                      data: `Random data for ${type}`,
                      value: Math.random() * 100
                  };
          }
          
          const message = generateMessage(type, frameId, additionalData);
          window.__CANVAS_BRIDGE__?.send('FRAME_EVENT', message);
          logMessage(message);
          return message;
      }

      function sendSingleFrame() {
          const config = getConfig();
          const currentFrameId = frameId++;
          
          // Send frame start
          const startMessage = sendFrameStart(currentFrameId);
          const startTime = startMessage.timestamp;
          
          // Send random messages
          for (let i = 0; i < config.messagesPerFrame; i++) {
              setTimeout(() => {
                  sendRandomMessage(currentFrameId);
              }, Math.random() * 10); // Spread messages over 10ms
          }
          
          // Send frame end
          setTimeout(() => {
              sendFrameEnd(currentFrameId, startTime);
          }, 12 + Math.random() * 4); // End frame after 12-16ms
      }

      function startSimulation() {
          if (isRunning) return;
          
          isRunning = true;
          updateStatus();
          
          const config = getConfig();
          
          intervalId = setInterval(() => {
              sendSingleFrame();
              
              // Occasionally skip a frame to simulate real behavior
              if (Math.random() < 0.05) {
                  // Skip this frame
                  return;
              }
              
          }, config.frameInterval);
      }

      function stopSimulation() {
          if (!isRunning) return;
          
          isRunning = false;
          if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
          }
          updateStatus();
      }

      function getConfig() {
          return {
              frameInterval: parseInt(frameIntervalRef.current?.value ?? 500),
              messagesPerFrame: parseInt(messagesPerFrameRef.current?.value ?? 10),
              frameVariability: parseInt(frameVariabilityRef.current?.value ?? 50),
              messageDiversity: parseInt(messageDiversityRef.current?.value ?? 8)
          };
      }

      function updateStatus() {
          if (isRunning) {
              setStatus({
                  text: 'Simulation Running - Sending frames every ' + getConfig().frameInterval + 'ms',
                  className: 'status running'
              });
          } else {
              setStatus({
                  text: 'Simulation Stopped',
                  className: 'status stopped'
              });
          }
      }

      function logMessage(message) {
          let className = 'log-entry';
          if (message.type === 'canvas-frame-start') {
              className += ' frame-start';
          } else if (message.type === 'canvas-frame-end') {
              className += ' frame-end';
          } else {
              className += ' message';
          }
          
          const timestamp = new Date().toLocaleTimeString();
          const frameInfo = message.frameId ? ` Frame ${message.frameId}` : '';
          
          const entry = {
              id: message.id,
              className,
              content: `[${timestamp}] ${message.type}${frameInfo} - ID: ${message.id}${message.duration ? ` (${message.duration.toFixed(2)}ms)` : ''}`
          };
          
          setLogEntries(prevEntries => {
              const newEntries = [...prevEntries, entry];
              // Keep only last 100 messages
              return newEntries.slice(-100);
          });
      }

    startSimulation();

    // Cleanup interval on component unmount
    return () => stopSimulation();
  }, []);

  // Auto-scroll message log when new entries are added
  useEffect(() => {
    if (messageLogRef.current) {
      messageLogRef.current.scrollTop = messageLogRef.current.scrollHeight;
    }
  }, [logEntries]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Canvas Extension Testing</h1>
        
        {/* Status Display */}
        <div ref={statusRef} className={status.className}>
          {status.text}
        </div>

        {/* Configuration Controls */}
        <div className="controls">
          <div className="control-group">
            <label htmlFor="frameInterval">Frame Interval (ms):</label>
            <input 
              ref={frameIntervalRef}
              type="number" 
              id="frameInterval" 
              defaultValue="500" 
              min="1" 
              max="5000"
            />
          </div>
          
          <div className="control-group">
            <label htmlFor="messagesPerFrame">Messages per Frame:</label>
            <input 
              ref={messagesPerFrameRef}
              type="number" 
              id="messagesPerFrame" 
              defaultValue="10" 
              min="1" 
              max="100"
            />
          </div>
          
          <div className="control-group">
            <label htmlFor="frameVariability">Frame Variability (%):</label>
            <input 
              ref={frameVariabilityRef}
              type="number" 
              id="frameVariability" 
              defaultValue="50" 
              min="0" 
              max="100"
            />
          </div>
          
          <div className="control-group">
            <label htmlFor="messageDiversity">Message Diversity:</label>
            <input 
              ref={messageDiversityRef}
              type="number" 
              id="messageDiversity" 
              defaultValue="8" 
              min="1" 
              max="15"
            />
          </div>
          
          <div className="control-group">
            <button onClick={clearLog}>Clear Log</button>
          </div>
        </div>

        {/* Message Log */}
        <div className="message-log-container">
          <h2>Message Log</h2>
          <div 
            ref={messageLogRef}
            className="message-log"
            style={{ 
              height: '400px', 
              overflowY: 'auto', 
              border: '1px solid #ccc', 
              padding: '10px',
              backgroundColor: '#f9f9f9',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'black'
            }}
          >
            {logEntries.map((entry, index) => (
              <div key={`${entry.id}-${index}`} className={entry.className}>
                {entry.content}
              </div>
            ))}
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
