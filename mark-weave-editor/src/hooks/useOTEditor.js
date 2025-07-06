/*
 * @FilePath: useOTEditor.js
 * @Author: Aron
 * @Date: 2025-01-27
 * @Description: OT版本的ProseMirror编辑器Hook，集成ShareDB - 多窗口同步版本
 */

import { useEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { schema } from "../plugins/schema";
import { keymap } from "prosemirror-keymap";
import { toggleMark } from "prosemirror-commands";
import OTClient from "../services/otClient";
import { useAuth } from "../contexts/AuthContext";

/**
 * OT版本的ProseMirror编辑器Hook - 多窗口同步版本
 * 参考useYjsEditor的实现方式，添加多窗口协作能力
 * @param {string} docId 文档ID
 * @param {string} collection 集合名
 * @param {React.RefObject} editorRef 编辑器DOM引用
 * @returns {[EditorView, OTClient, boolean, object]} [编辑器视图, OT客户端, 连接状态, 工具函数]
 */
export function useOTEditor(docId, collection = "documents", editorRef) {
  const [editorView, setEditorView] = useState(null);
  const [otClient, setOtClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [userStates, setUserStates] = useState(new Map());

  const viewRef = useRef(null);
  const otClientRef = useRef(null);
  const isInitializedRef = useRef(false);
  const { user: authUser } = useAuth();

  console.log("🔧 [OT] 当前文档ID:", docId, "集合:", collection);

  useEffect(() => {
    if (!editorRef.current || !docId || isInitializedRef.current) return;

    console.log("🚀 [OT] 初始化OT编辑器", { docId, collection });
    initializeOTEditor();
    isInitializedRef.current = true;

    return () => {
      cleanupEditor();
    };
  }, [docId, collection, authUser]);

  const cleanupEditor = () => {
    console.log("🧹 [OT] 清理编辑器资源");

    // 清理定期同步
    if (window.otSyncInterval) {
      clearInterval(window.otSyncInterval);
      window.otSyncInterval = null;
    }

    // 清理用户状态
    clearUserState();

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    if (otClientRef.current) {
      otClientRef.current.disconnect();
      otClientRef.current = null;
    }

    setEditorView(null);
    setOtClient(null);
    setIsConnected(false);
    setUserStates(new Map());
    isInitializedRef.current = false;
  };

  const initializeOTEditor = async () => {
    try {
      // 创建OT客户端
      const client = new OTClient();
      otClientRef.current = client;
      setOtClient(client);

      // 设置用户信息
      const setUserInfo = () => {
        if (authUser) {
          const userInfo = {
            name: authUser.username || authUser.email || "Unknown User",
            email: authUser.email,
            userId: authUser.userId,
            color: "#1890ff", // OT使用蓝色主题
            timestamp: Date.now(),
            online: true,
            clientId: client.connectionId || `ot_${Date.now()}`,
          };

          // 存储到localStorage进行多窗口同步
          const userKey = `ot_user_${userInfo.clientId}`;
          localStorage.setItem(userKey, JSON.stringify(userInfo));

          console.log("✅ [OT] 设置用户信息:", userInfo);

          // 更新本地状态
          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(userInfo.clientId, userInfo);
            return newStates;
          });
        } else {
          const fallbackUser = {
            name: "OT访客" + Math.floor(Math.random() * 100),
            color: "#1890ff",
            timestamp: Date.now(),
            online: true,
            clientId: client.connectionId || `ot_guest_${Date.now()}`,
          };

          const userKey = `ot_user_${fallbackUser.clientId}`;
          localStorage.setItem(userKey, JSON.stringify(fallbackUser));

          console.log("⚠️ [OT] 设置访客信息:", fallbackUser);

          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(fallbackUser.clientId, fallbackUser);
            return newStates;
          });
        }
      };

      // 注册连接事件监听器
      client.on("connected", (data) => {
        console.log("✅ [OT] 客户端连接成功", data);
        setIsConnected(true);

        // 连接成功后设置用户信息
        setUserInfo();

        // 订阅文档
        setTimeout(() => {
          client.subscribeDocument(collection, docId);
        }, 100);

        // 启动多窗口同步
        startMultiWindowSync();
      });

      client.on("disconnect", (data) => {
        console.log("🔌 [OT] 客户端连接断开", data);
        setIsConnected(false);
        clearUserState();
      });

      client.on("docUpdate", (data) => {
        console.log("📄 [OT] 收到文档更新", data);
        updateEditorFromOT(data);
      });

      client.on("operation", (data) => {
        console.log("⚡ [OT] 收到操作", data);
        updateEditorFromOT(data);
      });

      client.on("error", (error) => {
        console.error("❌ [OT] 客户端错误:", error);
        setIsConnected(false);

        // 连接失败后尝试重连
        setTimeout(() => {
          if (!isConnected && otClientRef.current) {
            console.log("🔄 [OT] 尝试重新连接...");
            otClientRef.current.reconnect();
          }
        }, 3000);
      });

      // 监听localStorage变化进行多窗口同步
      window.addEventListener("storage", handleStorageChange);

      // 🔥 移除模拟延迟 - 使用真实连接时序
      console.log("🔌 [OT] 连接到OT服务器: ws://localhost:1235");

      // 添加重试逻辑
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await client.connect("ws://localhost:1235");
          break; // 连接成功，退出重试循环
        } catch (error) {
          retryCount++;
          console.error(
            `❌ [OT] 连接失败 (${retryCount}/${maxRetries}):`,
            error
          );

          if (retryCount < maxRetries) {
            const retryDelay = 1000 * retryCount; // 递增延迟
            console.log(`🔄 [OT] ${retryDelay}ms后重试连接...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          } else {
            console.error("❌ [OT] 连接失败，已达到最大重试次数");
            setIsConnected(false);
          }
        }
      }

      // 创建ProseMirror编辑器
      createProseMirrorEditor(client);
    } catch (error) {
      console.error("❌ [OT] 编辑器初始化失败:", error);
      setIsConnected(false);
    }
  };

  const startMultiWindowSync = () => {
    // 定期同步用户在线状态
    window.otSyncInterval = setInterval(() => {
      if (otClientRef.current && isConnected && authUser) {
        const clientId = otClientRef.current.connectionId || `ot_${Date.now()}`;
        const userKey = `ot_user_${clientId}`;

        try {
          const existingUser = localStorage.getItem(userKey);
          if (existingUser) {
            const userInfo = JSON.parse(existingUser);
            userInfo.lastSeen = Date.now();
            userInfo.online = true;
            localStorage.setItem(userKey, JSON.stringify(userInfo));

            console.log("⏰ [OT] 定期同步用户在线状态");
          }
        } catch (error) {
          console.warn("[OT] 同步用户状态失败:", error);
        }

        // 清理过期用户
        cleanupExpiredUsers();
      }
    }, 3000); // 每3秒同步一次
  };

  const handleStorageChange = (event) => {
    if (event.key && event.key.startsWith("ot_user_")) {
      // 其他窗口的用户状态变化
      try {
        if (event.newValue) {
          const userInfo = JSON.parse(event.newValue);
          console.log("👥 [OT] 检测到其他窗口用户:", userInfo);

          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.set(userInfo.clientId, userInfo);
            return newStates;
          });
        } else if (event.oldValue) {
          // 用户离开
          const oldUserInfo = JSON.parse(event.oldValue);
          console.log("👋 [OT] 用户离开:", oldUserInfo);

          setUserStates((prev) => {
            const newStates = new Map(prev);
            newStates.delete(oldUserInfo.clientId);
            return newStates;
          });
        }
      } catch (error) {
        console.warn("[OT] 处理用户状态变化失败:", error);
      }
    }
  };

  const cleanupExpiredUsers = () => {
    const now = Date.now();
    const expireTime = 10000; // 10秒过期

    // 清理localStorage中的过期用户
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("ot_user_")) {
        try {
          const userInfo = JSON.parse(localStorage.getItem(key));
          if (now - userInfo.lastSeen > expireTime) {
            localStorage.removeItem(key);
            console.log("🗑️ [OT] 清理过期用户:", userInfo.name);
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    });

    // 更新本地状态
    setUserStates((prev) => {
      const newStates = new Map();
      prev.forEach((user, clientId) => {
        if (now - user.lastSeen <= expireTime) {
          newStates.set(clientId, user);
        }
      });
      return newStates;
    });
  };

  const clearUserState = () => {
    if (otClientRef.current) {
      const clientId = otClientRef.current.connectionId;
      if (clientId) {
        const userKey = `ot_user_${clientId}`;
        localStorage.removeItem(userKey);
        console.log("🧹 [OT] 清理用户状态");
      }
    }
  };

  const createProseMirrorEditor = (client) => {
    if (!editorRef.current || viewRef.current) return;

    console.log("📝 [OT] 创建ProseMirror编辑器");

    try {
      // 创建空的初始文档
      const initialDoc = schema.nodes.doc.create(
        null,
        schema.nodes.paragraph.create()
      );

      // 创建编辑器状态
      const state = EditorState.create({
        schema,
        doc: initialDoc,
        plugins: [
          keymap({
            "Mod-b": toggleMark(schema.marks.bold),
            "Mod-i": toggleMark(schema.marks.em),
          }),
        ],
      });

      // 创建编辑器视图
      const view = new EditorView(editorRef.current, {
        state,
        dispatchTransaction(tr) {
          if (!viewRef.current) return;

          try {
            // 检查是否是从OT同步的事务
            if (tr.getMeta("fromOT")) {
              const newState = viewRef.current.state.apply(tr);
              viewRef.current.updateState(newState);
              return;
            }

            // 应用用户输入
            const newState = viewRef.current.state.apply(tr);
            viewRef.current.updateState(newState);

            // 处理用户操作，转换为OT操作
            if (tr.docChanged && client && client.isConnected) {
              processUserOperations(tr, client);
            }
          } catch (error) {
            console.error("[OT] 处理编辑器事务失败:", error);
          }
        },
      });

      viewRef.current = view;
      setEditorView(view);

      console.log("✅ [OT] ProseMirror编辑器创建成功");
    } catch (error) {
      console.error("❌ [OT] 创建ProseMirror编辑器失败:", error);
    }
  };

  const processUserOperations = (tr, client) => {
    try {
      console.log("🔥 [OT] 处理用户操作", {
        docChanged: tr.docChanged,
        steps: tr.steps.length,
        isConnected: client.isConnected,
      });

      if (!tr.docChanged || !client || !client.isConnected) {
        return;
      }

      // 处理每个步骤
      tr.steps.forEach((step, index) => {
        console.log(`🔥 [OT] 处理步骤 ${index}:`, {
          stepType: step.constructor.name,
          from: step.from,
          to: step.to,
        });

        if (step.slice && step.slice.content.size > 0) {
          // 插入操作 - 支持富文本格式
          console.log(`🔤 [OT] 处理插入操作在位置 ${step.from}`);

          // 构建标准的Delta操作格式（直接发送操作数组，不包装在ops对象中）
          const deltaOps = [];
          if (step.from > 0) {
            deltaOps.push({ retain: step.from });
          }

          // 处理富文本格式 - 提取文本和格式信息
          step.slice.content.forEach((node) => {
            if (node.isText) {
              const text = node.text;
              const marks = node.marks || [];

              if (marks.length > 0) {
                // 有格式的文本
                const attributes = {};

                marks.forEach((mark) => {
                  switch (mark.type.name) {
                    case "bold":
                      attributes.bold = true;
                      break;
                    case "em":
                      attributes.italic = true;
                      break;
                    // 可以添加更多格式
                  }
                });

                // rich-text格式：{insert: text, attributes: {...}}
                deltaOps.push({ insert: text, attributes });
                console.log(`📝 [OT] 插入格式化文本: "${text}"`, attributes);
              } else {
                // 纯文本
                deltaOps.push({ insert: text });
                console.log(`📝 [OT] 插入纯文本: "${text}"`);
              }
            }
          });

          // ShareDB rich-text期望直接的Delta数组，不是{ops: [...]}格式
          const op = deltaOps;

          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] 富文本插入操作提交成功");
          } catch (error) {
            console.error("❌ [OT] 富文本插入操作提交失败:", error);
          }
        } else if (step.from !== step.to && step.slice?.content.size === 0) {
          // 删除操作
          const deleteLength = step.to - step.from;
          console.log(
            `🗑️ [OT] 删除 ${deleteLength} 个字符，从位置 ${step.from}`
          );

          // 构建标准的Delta删除操作格式
          const deltaOps = [];
          if (step.from > 0) {
            deltaOps.push({ retain: step.from });
          }
          deltaOps.push({ delete: deleteLength });

          // ShareDB rich-text期望直接的Delta数组
          const op = deltaOps;

          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] 删除操作提交成功");
          } catch (error) {
            console.error("❌ [OT] 删除操作提交失败:", error);
          }
        } else if (step.constructor.name === "AddMarkStep") {
          // 添加格式（如加粗、斜体等）
          const { from, to, mark } = step;
          const deltaOps = [];
          if (from > 0) deltaOps.push({ retain: from });
          const attrs = {};
          switch (mark.type.name) {
            case "bold":
              attrs.bold = true;
              break;
            case "em":
              attrs.italic = true;
              break;
            default:
              break;
          }
          if (Object.keys(attrs).length === 0) {
            // 不支持的格式，跳过
            return;
          }
          deltaOps.push({ retain: to - from, attributes: attrs });
          const op = deltaOps;
          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] 格式添加操作提交成功", op);
          } catch (error) {
            console.error("❌ [OT] 格式添加操作提交失败:", error);
          }
        } else if (step.constructor.name === "RemoveMarkStep") {
          // 移除格式
          const { from, to, mark } = step;
          const deltaOps = [];
          if (from > 0) deltaOps.push({ retain: from });
          const attrs = {};
          switch (mark.type.name) {
            case "bold":
              attrs.bold = null;
              break;
            case "em":
              attrs.italic = null;
              break;
            default:
              break;
          }
          if (Object.keys(attrs).length === 0) {
            return;
          }
          deltaOps.push({ retain: to - from, attributes: attrs });
          const op = deltaOps;
          try {
            client.submitOperation(collection, docId, op);
            console.log("✅ [OT] 格式移除操作提交成功", op);
          } catch (error) {
            console.error("❌ [OT] 格式移除操作提交失败:", error);
          }
        }
      });
    } catch (error) {
      console.error("❌ [OT] processUserOperations 失败:", error);
    }
  };

  // 重建ShareDB文档内容的辅助函数
  const reconstructDocumentFromShareDB = (shareDBData) => {
    try {
      console.log("🔧 [OT] 开始重建ShareDB文档:", shareDBData);

      if (!shareDBData) {
        console.log("📄 [OT] ShareDB数据为空");
        return [];
      }

      // ShareDB rich-text 文档的 data 字段包含 ops 数组
      let operations = [];

      if (Array.isArray(shareDBData)) {
        operations = shareDBData;
      } else if (shareDBData.ops && Array.isArray(shareDBData.ops)) {
        operations = shareDBData.ops;
      } else if (shareDBData && typeof shareDBData === "object") {
        // 如果直接就是操作对象，包装成数组
        operations = [shareDBData];
      }

      console.log(`🔧 [OT] 找到 ${operations.length} 个操作`);

      const textNodes = [];

      operations.forEach((op, index) => {
        console.log(`🔧 [OT] 处理操作 ${index}:`, op);

        if (op && typeof op === "object") {
          if (
            op.insert &&
            typeof op.insert === "string" &&
            op.insert.length > 0
          ) {
            // 插入文本操作
            const text = op.insert;
            const attributes = op.attributes || {};

            const marks = [];
            if (attributes.bold) marks.push(schema.marks.bold.create());
            if (attributes.italic) marks.push(schema.marks.em.create());

            textNodes.push(schema.text(text, marks));
            console.log(`📝 [OT] 添加文本节点: "${text}"`, attributes);
          } else if (op.retain) {
            // 保留操作 - 在文档重建时通常忽略
            console.log(`📍 [OT] 跳过保留操作: ${op.retain}`);
          } else if (op.delete) {
            // 删除操作 - 在文档重建时忽略
            console.log(`🗑️ [OT] 跳过删除操作: ${op.delete}`);
          }
        } else if (typeof op === "string" && op.length > 0) {
          // 纯文本
          textNodes.push(schema.text(op));
          console.log(`📝 [OT] 添加纯文本: "${op}"`);
        }
      });

      console.log(`✅ [OT] 重建完成，生成了 ${textNodes.length} 个文本节点`);
      return textNodes;
    } catch (error) {
      console.error("❌ [OT] 重建ShareDB文档失败:", error);
      return [];
    }
  };

  const updateEditorFromOT = (data) => {
    if (!viewRef.current || !data) return;

    try {
      console.log("🔄 [OT] 从OT更新编辑器", data);

      // 处理操作类型的数据
      if (data.op) {
        console.log("⚡ [OT] 处理操作更新:", data.op);

        // 应用rich-text格式的OT操作到编辑器
        const tr = viewRef.current.state.tr.setMeta("fromOT", true);
        let pos = 0;

        // ShareDB rich-text返回的是标准Delta数组格式：
        // - {retain: number}: 保留字符数
        // - {insert: text, attributes?: {}}: 插入文本
        // - {delete: number}: 删除字符数
        // data.op直接就是Delta数组
        const ops = Array.isArray(data.op) ? data.op : [data.op];
        ops.forEach((op, index) => {
          console.log(`🔧 [OT] 处理操作 ${index}:`, op);

          if (op.retain) {
            // 保留操作 - 移动位置
            pos += op.retain;
            console.log(`📍 [OT] 保留 ${op.retain} 个字符，位置移动到 ${pos}`);
            // 处理格式属性变化
            if (op.attributes) {
              const start = pos - op.retain;
              const end = pos;
              const { bold, italic } = op.attributes;
              if (bold !== undefined) {
                if (bold) {
                  tr.addMark(start, end, schema.marks.bold.create());
                } else {
                  tr.removeMark(start, end, schema.marks.bold);
                }
              }
              if (italic !== undefined) {
                if (italic) {
                  tr.addMark(start, end, schema.marks.em.create());
                } else {
                  tr.removeMark(start, end, schema.marks.em);
                }
              }
            }
          } else if (op && typeof op === "object" && op.insert) {
            // 插入带格式的文本
            const text = op.insert;
            const attributes = op.attributes || {};

            console.log(
              `➕ [OT] 在位置 ${pos} 插入格式化文本: "${text}"`,
              attributes
            );

            if (
              text &&
              pos >= 0 &&
              pos <= viewRef.current.state.doc.content.size
            ) {
              // 创建带格式的文本节点
              const marks = [];

              if (attributes.bold) {
                marks.push(schema.marks.bold.create());
              }
              if (attributes.italic) {
                marks.push(schema.marks.em.create());
              }

              // 插入带格式的文本
              if (marks.length > 0) {
                const textNode = schema.text(text, marks);
                tr.insert(pos, textNode);
              } else {
                tr.insertText(text, pos);
              }

              pos += text.length;
            }
          } else if (op.delete) {
            // 删除操作
            const deleteLength = op.delete;
            console.log(`➖ [OT] 从位置 ${pos} 删除 ${deleteLength} 个字符`);

            if (
              deleteLength > 0 &&
              pos >= 0 &&
              pos + deleteLength <= viewRef.current.state.doc.content.size
            ) {
              tr.delete(pos, pos + deleteLength);
            }
          }
        });

        // 只有当事务确实改变了文档时才分发
        if (tr.docChanged) {
          console.log("✅ [OT] 应用操作更新到编辑器");
          viewRef.current.dispatch(tr);
        } else {
          console.log("ℹ️ [OT] 操作未改变文档内容");
        }
      }

      // 处理文档状态类型的数据
      else if (data.data !== undefined) {
        console.log("📄 [OT] 处理文档状态更新:", data.data);
        console.log(
          "📄 [OT] 数据类型:",
          typeof data.data,
          "是否为数组:",
          Array.isArray(data.data)
        );

        // 尝试重建文档内容
        const reconstructedContent = reconstructDocumentFromShareDB(data.data);

        if (reconstructedContent && reconstructedContent.length > 0) {
          console.log("🔄 [OT] 重建的文档内容:", reconstructedContent);

          // 创建包含重建内容的新文档
          const newDoc = schema.nodes.doc.create(
            null,
            schema.nodes.paragraph.create(null, reconstructedContent)
          );

          // 应用到编辑器
          const tr = viewRef.current.state.tr
            .setMeta("fromOT", true)
            .replaceWith(
              0,
              viewRef.current.state.doc.content.size,
              newDoc.content
            );

          viewRef.current.dispatch(tr);
          console.log("✅ [OT] 文档内容重建完成");

          // 计算重建的文本内容用于日志
          const reconstructedText = reconstructedContent
            .map((node) => node.textContent || node.text || "")
            .join("");
          console.log(`📄 [OT] 重建的文本内容: "${reconstructedText}"`);
        } else {
          console.log("ℹ️ [OT] 无法重建文档内容或内容为空");
        }
      } else {
        console.log("⚠️ [OT] 未知的数据格式:", data);
      }
    } catch (error) {
      console.error("[OT] 从OT更新编辑器失败:", error);
    }
  };

  // 获取多窗口协作状态
  const getCollaborationState = () => {
    return {
      userStates: Array.from(userStates.values()),
      activeUsers: userStates.size,
      isMultiWindow: userStates.size > 1,
    };
  };

  // 提供重连功能
  const reconnect = () => {
    if (otClientRef.current) {
      console.log("🔄 [OT] 手动重连OT服务器");
      otClientRef.current.reconnect();
    }
  };

  // 清理函数
  const cleanup = () => {
    window.removeEventListener("storage", handleStorageChange);
    if (window.otSyncInterval) {
      clearInterval(window.otSyncInterval);
      window.otSyncInterval = null;
    }
    clearUserState();
  };

  // 页面卸载时清理
  useEffect(() => {
    const handleBeforeUnload = () => {
      clearUserState();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      cleanup();
    };
  }, []);

  return [
    editorView,
    otClient,
    isConnected,
    {
      reconnect,
      getCollaborationState,
      cleanup,
      userStates: Array.from(userStates.values()),
      activeUsers: userStates.size,
    },
  ];
}
