import React from "react";
import styles from "./RichTextEditor.module.css";

const RichTextEditor = () => {
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.teamName}>
          <button>Team name</button>
        </div>
        <nav className={styles.nav}>
          <ul>
            <li>Members</li>
            <li>Settings</li>
            <li>Help</li>
          </ul>
        </nav>
        <div className={styles.settings}>Settings</div>
      </aside>
      <main className={styles.main}>
        <div className={styles.header}>
          <span className={styles.title}>Rich-Text Editor</span>
          <button className={styles.saveBtn}>Save</button>
        </div>
        <div className={styles.toolbar}>
          <button>B</button>
          <button>I</button>
          <button>U</button>
          <button>|</button>
          <button>•</button>
          <button>1.</button>
          <button>|</button>
          <button>—</button>
        </div>
        <input className={styles.docTitle} placeholder='Document Title' />
        <div className={styles.editorArea}>
          <p>（这里是文档内容的占位符）</p>
        </div>
      </main>
    </div>
  );
};

export default RichTextEditor;
