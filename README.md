# Rastreador - Frontend

Este es el repositorio del frontend para la plataforma de rastreo "Rastreador". Es una aplicación multiplataforma (iOS, Android y Web) construida con React Native y Expo, diseñada para interactuar con el [backend de Rastreador](https://github.com/whosmandarina/rastreadorApp.git).

La aplicación ofrece dos interfaces principales:
1.  **Aplicación Móvil**: Para que los usuarios (ej. conductores, personal de campo) reporten su ubicación en tiempo real.
2.  **Dashboard Web**: Un panel de administración para supervisores y administradores que permite monitorear dispositivos, gestionar geocercas, ver alertas y generar reportes.

---

## ✨ Características Principales

### Aplicación Móvil (iOS & Android)
- **Seguimiento en Tiempo Real**: Envía coordenadas de ubicación y niveles de batería al servidor a través de WebSockets.
- **Sincronización Offline**: Almacena datos de ubicación localmente si se pierde la conexión y los sincroniza automáticamente al reconectarse.
- **Autenticación Segura**: Login para usuarios registrados.
- **Pantalla de Consentimiento**: Solicita los permisos necesarios para el rastreo en segundo plano.

### Dashboard Web
- **Visualización en Mapa**: Muestra la ubicación en tiempo real de todos los usuarios activos en un mapa interactivo.
- **Gestión de Geocercas**: Permite a los administradores crear, visualizar y eliminar zonas geográficas (geocercas) en el mapa.
- **Centro de Alertas**: Notifica sobre eventos importantes como entradas/salidas de geocercas, batería baja o pérdida de señal.
- **Gestión de Usuarios**: Panel para administrar los usuarios del sistema.
- **Generación de Reportes**: Interfaz para solicitar y visualizar reportes de actividad.

---

## 🚀 Stack Tecnológico

- **Framework**: React Native con Expo
- **Lenguaje**: TypeScript
- **Navegación**: Expo Router (navegación basada en archivos)
- **Gestión de Estado**: Zustand (un gestor de estado simple y potente)
- **Peticiones HTTP**: Axios
- **Comunicación Real-Time**: Socket.io Client
- **Mapas**: `react-native-maps`
- **Almacenamiento Local**: `expo-secure-store` para datos sensibles y `expo-sqlite` / `@react-native-async-storage/async-storage` para datos de sesión y offline.
- **Estilo y Formato**: Prettier

---

## 📁 Estructura del Proyecto

El código fuente está organizado para facilitar la escalabilidad y el mantenimiento:

```
├── app/                  # Rutas y pantallas (gestionado por Expo Router)
│   ├── (auth)/           # Flujo de autenticación (login, registro)
│   ├── (mobile)/         # Pantallas específicas para la app móvil
│   └── (web)/            # Pantallas específicas para el dashboard web
├── src/                  # Lógica de negocio, componentes y servicios
│   ├── components/       # Componentes de UI reutilizables
│   ├── services/         # Lógica para interactuar con la API del backend
│   ├── stores/           # Stores de Zustand para gestionar el estado global
│   └── hooks/            # Hooks de React personalizados
├── assets/               # Imágenes, fuentes y otros recursos estáticos
└── index.js              # Punto de entrada de la aplicación (gestionado por Expo)
```

---

## 🏁 Cómo Empezar

Sigue estos pasos para ejecutar el proyecto en tu entorno de desarrollo local.

**Prerrequisitos:**
- Node.js (versión LTS recomendada)
- Watchman (para macOS)
- Un dispositivo físico o emulador/simulador para pruebas móviles.
- El backend de Rastreador debe estar ejecutándose.

**Instalación:**

1.  **Clona el repositorio:**
    ```bash
    git clone <URL-DEL-REPOSITORIO>
    cd <NOMBRE-DEL-PROYECTO>
    ```

2.  **Instala las dependencias:**
    ```bash
    npm install
    ```

3.  **Configura la conexión con el backend:**
    Crea un archivo `.env` en la raíz del proyecto si necesitas configurar variables de entorno, como la URL de la API del backend.

4.  **Ejecuta la aplicación:**
    Utiliza los siguientes scripts para iniciar la aplicación en la plataforma deseada.

---

## 📜 Scripts Disponibles

| Script          | Descripción                                        |
| :-------------- | :------------------------------------------------- |
| `npm start`     | Inicia Metro Bundler para desarrollo.              |
| `npm run android` | Inicia la aplicación en un dispositivo/emulador Android. |
| `npm run ios`     | Inicia la aplicación en un dispositivo/simulador iOS.  |
| `npm run web`     | Inicia la aplicación en un navegador web.          |
| `npm run format`  | Formatea todo el código con Prettier.              |

```