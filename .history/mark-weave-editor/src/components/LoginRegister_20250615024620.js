import React from "react";
import styles from "./LoginRegister.module.css";

const LoginRegister = () => {
  return (
    <div className={styles.container}>
      <div className={styles.loginSection}>
        <h2>Login</h2>
        <form className={styles.form}>
          <label>Email</label>
          <input type='email' placeholder='Email' />
          <label>Password</label>
          <input type='password' placeholder='Password' />
          <button type='button' className={styles.loginBtn}>
            Login
          </button>
          <div className={styles.forgotRow}>
            <input type='checkbox' id='forgot' />
            <label htmlFor='forgot'>Forgot password?</label>
          </div>
        </form>
      </div>
      <div className={styles.registerSection}>
        <h2>Register</h2>
        <div className={styles.registerBox}>
          <span>Don't have an account?</span>
          <button type='button' className={styles.signupBtn}>
            Sign up
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginRegister;
