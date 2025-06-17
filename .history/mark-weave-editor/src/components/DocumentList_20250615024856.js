import React from "react";
import styles from "./DocumentList.module.css";

const DocumentList = () => {
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
          <span className={styles.title}>Document List</span>
          <button className={styles.filterBtn}>Filter →</button>
        </div>
        <div className={styles.toolbar}>
          <input className={styles.search} placeholder='Filter...' />
          <button className={styles.newBtn}>New</button>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Last updated ?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Document title</td>
              <td>Apr 16</td>
            </tr>
            <tr>
              <td>Document title</td>
              <td>Apr 16</td>
            </tr>
            <tr>
              <td>Document title</td>
              <td>Apr 16</td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  );
};

export default DocumentList;
