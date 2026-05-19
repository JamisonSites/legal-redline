// vite.config.js
import { defineConfig } from "file:///sessions/ecstatic-loving-turing/mnt/Legal%20Red%20Line/legal-redline/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/ecstatic-loving-turing/mnt/Legal%20Red%20Line/legal-redline/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    proxy: {
      "/ecfr-api": {
        target: "https://www.ecfr.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ecfr-api/, "/api/versioner/v1")
      },
      "/govinfo-api": {
        target: "https://api.govinfo.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/govinfo-api/, "")
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvZWNzdGF0aWMtbG92aW5nLXR1cmluZy9tbnQvTGVnYWwgUmVkIExpbmUvbGVnYWwtcmVkbGluZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Nlc3Npb25zL2Vjc3RhdGljLWxvdmluZy10dXJpbmcvbW50L0xlZ2FsIFJlZCBMaW5lL2xlZ2FsLXJlZGxpbmUvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Nlc3Npb25zL2Vjc3RhdGljLWxvdmluZy10dXJpbmcvbW50L0xlZ2FsJTIwUmVkJTIwTGluZS9sZWdhbC1yZWRsaW5lL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICBiYXNlOiAnLi8nLFxuICBzZXJ2ZXI6IHtcbiAgICBwcm94eToge1xuICAgICAgJy9lY2ZyLWFwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly93d3cuZWNmci5nb3YnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9lY2ZyLWFwaS8sICcvYXBpL3ZlcnNpb25lci92MScpLFxuICAgICAgfSxcbiAgICAgICcvZ292aW5mby1hcGknOiB7XG4gICAgICAgIHRhcmdldDogJ2h0dHBzOi8vYXBpLmdvdmluZm8uZ292JyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvZ292aW5mby1hcGkvLCAnJyksXG4gICAgICB9XG4gICAgfVxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF5WCxTQUFTLG9CQUFvQjtBQUN0WixPQUFPLFdBQVc7QUFFbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLE1BQU07QUFBQSxFQUNOLFFBQVE7QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLGFBQWE7QUFBQSxRQUNYLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxlQUFlLG1CQUFtQjtBQUFBLE1BQ3BFO0FBQUEsTUFDQSxnQkFBZ0I7QUFBQSxRQUNkLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxRQUNkLFNBQVMsQ0FBQyxTQUFTLEtBQUssUUFBUSxrQkFBa0IsRUFBRTtBQUFBLE1BQ3REO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
