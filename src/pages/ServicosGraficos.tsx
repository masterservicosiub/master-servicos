import Orcamento from "./Orcamento";
import logoGrafica from "./assets/logo-master-grafica.png"; // ajuste o caminho da imagem

const ServicosGraficos = () => (
  <Orcamento
    kind="grafico"
    pageTitle={
      <img
        src={logoGrafica}
        alt="Master Gráfica"
        style={{
          maxWidth: "280px",
          width: "100%",
          height: "auto",
          display: "block",
          margin: "0 auto"
        }}
      />
    }
    pageSubtitle="Solicite cartões, banners, panfletos e outros materiais gráficos."
  />
);

export default ServicosGraficos;
