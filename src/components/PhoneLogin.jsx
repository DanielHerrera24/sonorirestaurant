import { useState, useEffect } from "react";
import { signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";
import { auth } from "../firebase";

function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  useEffect(() => {
    console.log("auth:", auth);
    if (!window.recaptchaVerifier && auth) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(
          "recaptcha-container",
          {
            size: "invisible",
            callback: () => {
              // Recaptcha solved
              console.log("reCAPTCHA resuelto");
            },
            "expired-callback": () => {
              // Recaptcha expired
              console.log("reCAPTCHA expirado");
            },
          },
          auth
        );
        window.recaptchaVerifier.render().then((widgetId) => {
          console.log("reCAPTCHA renderizado, widgetId:", widgetId);
        });
      } catch (error) {
        console.error("Error al inicializar reCAPTCHA:", error);
      }
    }
  }, []);

  const sendCode = async (e) => {
    e.preventDefault();
    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      alert(
        "Por favor ingresa el número en formato internacional, por ejemplo: +526531301155"
      );
      return;
    }
    console.log("Enviando código a:", formattedPhone);
    try {
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier
      );
      setConfirmation(confirmationResult);
      alert("Código enviado por SMS");
      console.log("Código enviado, confirmationResult:", confirmationResult);
    } catch (error) {
      alert(error.message);
      console.error("Error al enviar código:", error);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    console.log("Verificando código:", code);
    try {
      await confirmation.confirm(code);
      alert("¡Inicio de sesión exitoso!");
      window.location.href = "/tarjeta";
    } catch (error) {
      alert(error.message || "Código incorrecto");
      console.error("Error al verificar código:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      {!confirmation ? (
        <form onSubmit={sendCode} className="flex flex-col gap-4">
          <input
            type="tel"
            placeholder="Tu número (+52...)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="border p-2 rounded"
          />
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Enviar código
          </button>
          <div id="recaptcha-container"></div>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Código SMS"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="border p-2 rounded"
          />
          <button type="submit" className="bg-green-500 text-white p-2 rounded">
            Verificar
          </button>
        </form>
      )}
    </div>
  );
}

export default PhoneLogin;