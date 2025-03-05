/*
 * @FilePath: Toolbar.js
 * @Author: Aron
 * @Date: 2025-02-27 02:17:04
 * @LastEditors:
 * @LastEditTime: 2025-02-27 02:17:04
 * Copyright: 2025 xxxTech CO.,LTD. All Rights Reserved.
 * @Descripttion:
 */
// Toolbar.js
import React from "react";

const Toolbar = ({ onBold, onItalic, onLink }) => {
  return (
    <div className='editor-toolbar'>
      <button onClick={onBold}>Bold</button>
      <button onClick={onItalic}>Italic</button>
      <button onClick={onLink}>Link</button>
    </div>
  );
};

export default Toolbar;
