/**
 * Template Loader System
 * แยก HTML Templates ออกจาก index.html เพื่อให้จัดการง่ายขึ้น
 * Version: 1.0
 */

class TemplateLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Map();
    this.baseUrl = './templates/';
  }

  /**
   * โหลด Template จากไฟล์
   * @param {string} templatePath - path ของ template (เช่น 'pages/student-schedule')
   * @param {boolean} useCache - ใช้ cache หรือไม่ (default: true)
   * @returns {Promise<string>} HTML content
   */
  async load(templatePath, useCache = true) {
    // ตรวจสอบ cache
    if (useCache && this.cache.has(templatePath)) {
      return this.cache.get(templatePath);
    }

    // ตรวจสอบการ loading ที่กำลังดำเนินการ
    if (this.loading.has(templatePath)) {
      return this.loading.get(templatePath);
    }

    // สร้าง loading promise
    const loadPromise = this.fetchTemplate(templatePath);
    this.loading.set(templatePath, loadPromise);

    try {
      const html = await loadPromise;
      
      // บันทึกใน cache
      if (useCache) {
        this.cache.set(templatePath, html);
      }
      
      this.loading.delete(templatePath);
      return html;
    } catch (error) {
      this.loading.delete(templatePath);
      throw error;
    }
  }

  /**
   * ดึง Template จาก server
   * @param {string} templatePath 
   * @returns {Promise<string>}
   */
  async fetchTemplate(templatePath) {
    const url = `${this.baseUrl}${templatePath}.html`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${url} (${response.status})`);
      }
      
      const html = await response.text();
      return html;
    } catch (error) {
      console.error(`Template loading error: ${templatePath}`, error);
      throw new Error(`Cannot load template: ${templatePath}`);
    }
  }

  /**
   * โหลดและแทรก Template เข้า DOM
   * @param {string} templatePath - path ของ template
   * @param {string|HTMLElement} target - target element หรือ selector
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   */
  async render(templatePath, target, options = {}) {
    const {
      replace = false,    // แทนที่เนื้อหาเดิมหรือไม่
      animate = true,     // มี animation หรือไม่
      variables = {},     // ตัวแปรสำหรับแทนที่ใน template
    } = options;

    try {
      // โหลด template
      let html = await this.load(templatePath);
      
      // แทนที่ตัวแปร
      html = this.processVariables(html, variables);
      
      // หา target element
      const element = typeof target === 'string' ? document.querySelector(target) : target;
      if (!element) {
        throw new Error(`Target element not found: ${target}`);
      }

      // แทรก HTML
      if (replace) {
        if (animate) {
          await this.animateReplace(element, html);
        } else {
          element.innerHTML = html;
        }
      } else {
        if (animate) {
          await this.animateAppend(element, html);
        } else {
          element.insertAdjacentHTML('beforeend', html);
        }
      }

      return element;
    } catch (error) {
      console.error(`Template render error: ${templatePath}`, error);
      throw error;
    }
  }

  /**
   * แทนที่ตัวแปรใน template
   * @param {string} html 
   * @param {Object} variables 
   * @returns {string}
   */
  processVariables(html, variables) {
    if (!variables || Object.keys(variables).length === 0) {
      return html;
    }

    let processed = html;
    
    // แทนที่ตัวแปรแบบ {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      processed = processed.replace(regex, String(value));
    }

    return processed;
  }

  /**
   * Animation สำหรับการแทนที่เนื้อหา
   * @param {HTMLElement} element 
   * @param {string} newHtml 
   */
  async animateReplace(element, newHtml) {
    // Fade out
    element.style.transition = 'opacity 0.2s ease-out';
    element.style.opacity = '0';
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Replace content
    element.innerHTML = newHtml;
    
    // Fade in
    element.style.opacity = '1';
    
    // Clean up
    setTimeout(() => {
      element.style.transition = '';
      element.style.opacity = '';
    }, 200);
  }

  /**
   * Animation สำหรับการเพิ่มเนื้อหา
   * @param {HTMLElement} element 
   * @param {string} newHtml 
   */
  async animateAppend(element, newHtml) {
    // สร้าง temporary container
    const temp = document.createElement('div');
    temp.innerHTML = newHtml;
    temp.style.opacity = '0';
    temp.style.transform = 'translateY(10px)';
    temp.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    
    element.appendChild(temp);
    
    // Trigger animation
    setTimeout(() => {
      temp.style.opacity = '1';
      temp.style.transform = 'translateY(0)';
    }, 10);
    
    // Clean up
    setTimeout(() => {
      while (temp.firstChild) {
        element.appendChild(temp.firstChild);
      }
      element.removeChild(temp);
    }, 300);
  }

  /**
   * โหลด template หลายๆ อันพร้อมกัน
   * @param {string[]} templatePaths 
   * @returns {Promise<Object>} Object ที่มี key เป็น templatePath และ value เป็น HTML
   */
  async loadMultiple(templatePaths) {
    const promises = templatePaths.map(async (path) => ({
      path,
      html: await this.load(path)
    }));

    const results = await Promise.all(promises);
    
    const templates = {};
    results.forEach(({ path, html }) => {
      templates[path] = html;
    });

    return templates;
  }

  /**
   * ล้าง cache
   * @param {string} templatePath - path เฉพาะ หรือเว้นว่างเพื่อล้างทั้งหมด
   */
  clearCache(templatePath = null) {
    if (templatePath) {
      this.cache.delete(templatePath);
    } else {
      this.cache.clear();
    }
  }

  /**
   * ดู cache ทั้งหมด (สำหรับ debug)
   */
  getCacheInfo() {
    return {
      cached: Array.from(this.cache.keys()),
      loading: Array.from(this.loading.keys()),
      cacheSize: this.cache.size
    };
  }
}

// สร้าง global instance
const templateLoader = new TemplateLoader();

// Export functions
export {
  templateLoader as default,
  TemplateLoader
};

// Convenience functions
export const loadTemplate = (path, useCache = true) => templateLoader.load(path, useCache);
export const renderTemplate = (path, target, options = {}) => templateLoader.render(path, target, options);
export const loadMultipleTemplates = (paths) => templateLoader.loadMultiple(paths);
export const clearTemplateCache = (path = null) => templateLoader.clearCache(path);
