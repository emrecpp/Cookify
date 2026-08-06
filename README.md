

# Cookify - Chrome Extension for Cookie and Bearer Token Management 🍪🔑


**Cookify** is a **Chrome extension** that makes managing cookies and JWT tokens easy for developers. It integrates smoothly with Swagger API docs, helping you automate tasks, save time, and boost productivity. Built with React, TypeScript, and Vite, it’s fast, reliable, and perfect for modern web development.

[⬇️ Download on Chrome Web Store](https://chromewebstore.google.com/detail/cookify/mafdkfnimilggjneibkjfejlnhcecnjd)

---

<p align="center">
<img width="300" height="300" align="center" src="public/icon/icon.svg" alt="Cookify Logo" style="min-width: 300px">
</p>

## ✨ Features

### 🔑 **Cookie Management**
- **Add Cookies**: Manually add cookies with a user-friendly interface.
- **Save Cookies**: Store cookies for quick reuse.
- **Apply Cookies**: Set saved cookies on target websites with one click.
- **Delete Cookies**: Easily remove cookies when they are no longer needed.
- **Filter Cookies**: Search and filter cookies by name or value.

### 🔒 **JWT Token Management**
- **Save JWT Tokens**: Input and store JWT bearer tokens securely.
- **Apply to Swagger**: Set tokens in Swagger documentation with one click.

### 🎯 **Project Management**
- **Organize by Projects**: Group cookies and tokens by project for better organization
- **Multiple Projects**: Create and manage different projects for various applications
- **Project Filtering**: Filter cookies and tokens by project

### 🔄 **Profile Management**
- **Export Profiles**: Save all your cookies and tokens into a single exportable file.
- **Import Profiles**: Import your profiles into the extension on a different machine or browser.
- **Optional Google Drive Sync**: Back up profiles and settings to Cookify's private Drive app-data folder and merge them across computers.
- **Conflict Resolution**: Compare local and cloud cookies/JWTs, inspect timestamps and decoded JWT previews, then choose the version to keep.

### 📜 **Swagger Integration**
- **Swagger Support**: Streamline your API testing by setting cookies and JWT tokens directly into Swagger documentation.
- **One-Click Token Application**: Set your bearer token in Swagger docs with a single click.

### 🚀 **Optimized for Developers**
- Built with **React**, **TypeScript**, and **Vite** for blazing-fast performance.
- Intuitive design with a developer-first approach.

---

## 🎥 Demo Videos
Check out these short videos to see Cookify in action:

- **Cookie Management**
<video src="https://github.com/user-attachments/assets/bd5238dc-8e9f-4638-9038-1929623f3af3" controls width="100%"></video>



- **Swagger Integration**
<video src="https://github.com/user-attachments/assets/556fab44-7374-4294-933c-7a982f7d3083" controls width="100%"></video>






---


## 🛠️ Technologies

- **React**: For building a dynamic and responsive user interface.
- **TypeScript**: For type-safe and maintainable code.
- **Vite**: For a fast and modern development experience.

---


## 🚀 Installation

1. **Clone the Repository**:
   ```
   git clone https://github.com/emrecpp/Cookify.git
   cd Cookify
   ```

2. **Install Dependencies**:
   ```
   npm install
   ```

3. **Run in Development Mode**:
   ```
   npm run dev
   ```

4. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer Mode**.
   - Click **Load Unpacked** and select the `dist` folder from the project.

### Google Drive OAuth setup

Google Drive sync is optional and disabled unless the user connects an account from Settings. To enable the Connect button in a build:

1. Enable the Google Drive API in a Google Cloud project.
2. Create an OAuth 2.0 client for a Chrome extension and bind it to the Cookify extension ID. The published ID is `mafdkfnimilggjneibkjfejlnhcecnjd`; unpacked development builds may use a different stable ID.
3. Create a Web application OAuth client for account switching and add `https://<extension-id>.chromiumapp.org/google-oauth` to its authorized redirect URIs.
4. Add both client IDs to a local `.env` file:

   ```env
   VITE_GOOGLE_OAUTH_CLIENT_ID=1234567890-example.apps.googleusercontent.com
   VITE_GOOGLE_OAUTH_WEB_CLIENT_ID=1234567890-example-web.apps.googleusercontent.com
   ```

5. Run `npm run build` and load `dist` in Chrome.

Cookify requests only `https://www.googleapis.com/auth/drive.appdata`. This hidden area is accessible to Cookify but does not grant access to the user's other Drive files. OAuth client IDs are public identifiers; never add a client secret to the extension.

---


## 🤝 Contributing

If you'd like to contribute, please:
1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a detailed description of your changes.

---

## 📜 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

**Cookify** is here to make your development workflow faster, smoother, and more efficient. Try it out today and take control of your cookies and tokens like never before! 🚀🍪
