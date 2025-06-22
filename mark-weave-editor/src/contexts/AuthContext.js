import React, { createContext, useContext, useReducer, useEffect } from "react";
import apiService from "../services/api";

const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "LOGIN_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
      };
    case "LOGOUT":
      localStorage.removeItem("token");
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        loading: false,
      };
    case "AUTH_ERROR":
      localStorage.removeItem("token");
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload,
      };
    default:
      return state;
  }
};

const initialState = {
  user: null,
  token: localStorage.getItem("token"),
  isAuthenticated: false,
  loading: true,
  error: null,
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 检查token并加载用户信息
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const user = await apiService.getProfile();
          dispatch({ type: "SET_USER", payload: user });
        } catch (error) {
          console.error("认证检查失败:", error);
          dispatch({ type: "AUTH_ERROR", payload: error.message });
        }
      } else {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    };

    checkAuth();
  }, []);

  // 登录
  const login = async (credentials) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await apiService.login(credentials);

      localStorage.setItem("token", response.token);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: {
            userId: response.userId,
            username: response.username,
          },
          token: response.token,
        },
      });

      return response;
    } catch (error) {
      dispatch({ type: "AUTH_ERROR", payload: error.message });
      throw error;
    }
  };

  // 注册
  const register = async (userData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true });
      const response = await apiService.register(userData);

      localStorage.setItem("token", response.token);
      dispatch({
        type: "LOGIN_SUCCESS",
        payload: {
          user: {
            userId: response.userId,
            username: response.username,
          },
          token: response.token,
        },
      });

      return response;
    } catch (error) {
      dispatch({ type: "AUTH_ERROR", payload: error.message });
      throw error;
    }
  };

  // 登出
  const logout = () => {
    dispatch({ type: "LOGOUT" });
  };

  const value = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
