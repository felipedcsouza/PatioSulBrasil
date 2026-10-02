import { useEffect, useState } from "react";



import { useNavigate } from "react-router-dom";



import { supabase } from "../API/supabaseClient";







function CadastrarVeiculo() {



  const navigate = useNavigate();







  // =========================================================



  // FORMULÁRIO



  // =========================================================







  const [form, setForm] = useState({



    placa: "",



    renavam: "",



    chassi: "",



    marca: "",



    modelo: "",



    cor: "",



    ano: "",



    proprietario: "",



    patio: "",



    categoriaCobranca: "CARRO",



    status: "EM_PATIO",



    observacoes: "",



  });







  // =========================================================



  // IMAGENS



  // =========================================================







  const [imagens, setImagens] = useState([]);

  // =========================================================
  // INTELIGÊNCIA ARTIFICIAL - ANÁLISE DAS FOTOS
  // =========================================================

  const [analisandoIa, setAnalisandoIa] = useState(false);
  const [analiseIa, setAnaliseIa] = useState(null);
  const [erroIa, setErroIa] = useState("");
  const [imagemAnalisadaIa, setImagemAnalisadaIa] = useState(null);
  const [camposPreenchidosIa, setCamposPreenchidosIa] = useState({});







  // =========================================================



  // ESTADOS



  // =========================================================







  const [salvando, setSalvando] = useState(false);



  const [erro, setErro] = useState("");



  const [sucesso, setSucesso] = useState("");







  // =========================================================



  // CONTROLE POR PÁTIO



  // =========================================================







  const [patios, setPatios] = useState([]);



  const [perfilAtual, setPerfilAtual] = useState(null);



  const [patioSelecionadoId, setPatioSelecionadoId] = useState("");



  const [carregandoContextoPatio, setCarregandoContextoPatio] = useState(true);







  // =========================================================



  // DIÁRIA DO PÁTIO



  // =========================================================







  const [valorDiaria, setValorDiaria] = useState(null);



  const [tarifaEncontrada, setTarifaEncontrada] = useState(false);



  const [carregandoTarifa, setCarregandoTarifa] = useState(false);







  const ehMaster =



    perfilAtual?.cargo === "MASTER" &&



    perfilAtual?.status === "APROVADO";







  const patioSelecionado = patios.find(



    (item) => String(item.id) === String(patioSelecionadoId)



  );







  useEffect(() => {



    carregarContextoPatio();



  }, []);







  useEffect(() => {



    carregarTarifaPatio();



  }, [patioSelecionadoId, form.categoriaCobranca]);







  async function carregarTarifaPatio() {



    if (!patioSelecionadoId || !form.categoriaCobranca) {



      setValorDiaria(null);



      setTarifaEncontrada(false);



      return;



    }







    try {



      setCarregandoTarifa(true);







      const { data, error } = await supabase



        .from("tarifas_patio")



        .select("id, valor_diaria, ativo")



        .eq("patio_id", Number(patioSelecionadoId))



        .eq("categoria", form.categoriaCobranca)



        .eq("ativo", true)



        .maybeSingle();







      if (error) {



        throw error;



      }







      if (!data) {



        setValorDiaria(null);



        setTarifaEncontrada(false);



        return;



      }







      setValorDiaria(Number(data.valor_diaria || 0));



      setTarifaEncontrada(true);



    } catch (error) {



      console.error("Erro ao carregar tarifa do pátio:", error);



      setValorDiaria(null);



      setTarifaEncontrada(false);



    } finally {



      setCarregandoTarifa(false);



    }



  }







  function formatarMoeda(valor) {



    return Number(valor || 0).toLocaleString("pt-BR", {



      style: "currency",



      currency: "BRL",



    });



  }







  async function carregarContextoPatio() {



    try {



      setCarregandoContextoPatio(true);







      const { data: authData, error: authError } =



        await supabase.auth.getUser();







      if (authError) {



        throw authError;



      }







      const usuario = authData?.user;







      if (!usuario) {



        throw new Error("Nenhum usuário autenticado.");



      }







      const [perfilResponse, patiosResponse] = await Promise.all([



        supabase



          .from("profiles")



          .select("id, cargo, status, patio_id")



          .eq("id", usuario.id)



          .single(),







        supabase



          .from("patios")



          .select("id, nome, cidade, estado, ativo")



          .eq("ativo", true)



          .order("nome"),



      ]);







      if (perfilResponse.error) {



        throw perfilResponse.error;



      }







      if (patiosResponse.error) {



        throw patiosResponse.error;



      }







      const perfil = perfilResponse.data;



      const listaPatios = patiosResponse.data || [];







      setPerfilAtual(perfil);



      setPatios(listaPatios);







      if (perfil?.cargo !== "MASTER") {



        if (!perfil?.patio_id) {



          throw new Error(



            "Seu usuário ainda não está vinculado a um pátio. Peça ao administrador para definir sua unidade."



          );



        }







        const patioUsuario = listaPatios.find(



          (item) => String(item.id) === String(perfil.patio_id)



        );







        setPatioSelecionadoId(String(perfil.patio_id));







        if (patioUsuario) {



          setForm((anterior) => ({



            ...anterior,



            patio: patioUsuario.nome,



          }));



        }



      }



    } catch (error) {



      console.error("Erro ao carregar pátio do usuário:", error);



      setErro(



        error?.message ||



          "Não foi possível carregar as informações do pátio."



      );



    } finally {



      setCarregandoContextoPatio(false);



    }



  }







  function handlePatioSelecionado(event) {



    const valor = event.target.value;







    setPatioSelecionadoId(valor);



    setValorDiaria(null);



    setTarifaEncontrada(false);







    const patio = patios.find(



      (item) => String(item.id) === String(valor)



    );







    setForm((anterior) => ({



      ...anterior,



      patio: patio?.nome || "",



    }));



  }







  // =========================================================



  // ALTERAR CAMPOS



  // =========================================================







  function handleChange(event) {

    const { name, value } = event.target;

    if (
      Object.prototype.hasOwnProperty.call(camposPreenchidosIa, name) &&
      value !== camposPreenchidosIa[name]
    ) {
      setCamposPreenchidosIa((anteriores) => {
        const novos = { ...anteriores };
        delete novos[name];
        return novos;
      });
    }

    setForm((anterior) => ({
      ...anterior,
      [name]: value,
    }));

  }



  // =========================================================
  // FUNÇÕES DA INTELIGÊNCIA ARTIFICIAL
  // =========================================================

  function arquivoParaDataUrl(arquivo) {
    return new Promise((resolve, reject) => {
      const leitor = new FileReader();

      leitor.onload = () => resolve(String(leitor.result || ""));
      leitor.onerror = () => reject(new Error("Não foi possível ler a imagem."));
      leitor.readAsDataURL(arquivo);
    });
  }

  function normalizarPlacaIa(valor) {
    if (!valor) return "";

    return String(valor)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 7);
  }

  function limparAnaliseIaDaImagem(arquivo) {
    if (!arquivo || imagemAnalisadaIa !== arquivo) return;

    setForm((anterior) => {
      const proximo = { ...anterior };

      Object.entries(camposPreenchidosIa).forEach(([campo, valorIa]) => {
        if (proximo[campo] === valorIa) {
          proximo[campo] = "";
        }
      });

      return proximo;
    });

    setCamposPreenchidosIa({});
    setAnaliseIa(null);
    setErroIa("");
    setImagemAnalisadaIa(null);
  }

  function aplicarResultadoIa(resultado, arquivo) {
    const valoresIa = {
      placa: normalizarPlacaIa(resultado?.placa),
      marca: String(resultado?.marca || "").trim(),
      modelo: String(resultado?.modelo || "").trim(),
      cor: String(resultado?.cor || "").trim(),
    };

    const novosCamposIa = {};

    setForm((anterior) => {
      const proximo = { ...anterior };

      Object.entries(camposPreenchidosIa).forEach(([campo, valorIaAnterior]) => {
        if (proximo[campo] === valorIaAnterior) {
          proximo[campo] = "";
        }
      });

      Object.entries(valoresIa).forEach(([campo, valor]) => {
        if (valor && !String(proximo[campo] || "").trim()) {
          proximo[campo] = valor;
          novosCamposIa[campo] = valor;
        }
      });

      return proximo;
    });

    setCamposPreenchidosIa(novosCamposIa);
    setImagemAnalisadaIa(arquivo);
  }

  async function analisarImagemComIa(arquivo) {
    if (!arquivo || analisandoIa) return;

    try {
      setAnalisandoIa(true);
      setErroIa("");

      const dataUrl = await arquivoParaDataUrl(arquivo);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error("Sua sessão expirou. Entre novamente no sistema.");
      }

      const { data, error } = await supabase.functions.invoke(
        "analisar-veiculo",
        {
          body: {
            imagem: dataUrl,
            categoria_esperada: form.categoriaCobranca,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) {
        let detalhe = "";

        try {
          const corpoErro = await error.context?.json();
          detalhe = corpoErro?.erro || corpoErro?.message || "";
        } catch {
          // Mantém a mensagem original do Supabase.
        }

        throw new Error(
          detalhe || error.message || "Não foi possível analisar a imagem."
        );
      }

      if (!data?.sucesso) {
        throw new Error(data?.erro || "A IA não conseguiu analisar a imagem.");
      }

      const resultado = data.resultado || data;

      setAnaliseIa(resultado);
      setImagemAnalisadaIa(arquivo);

      if (resultado?.veiculo_detectado) {
        aplicarResultadoIa(resultado, arquivo);
      } else {
        setCamposPreenchidosIa({});
      }
    } catch (error) {
      console.error("Erro ao analisar veículo com IA:", error);
      setErroIa(error?.message || "Não foi possível analisar esta imagem.");
    } finally {
      setAnalisandoIa(false);
    }
  }

  function usarCategoriaDetectada() {
    const categoria = analiseIa?.tipo;

    if (!["CARRO", "MOTO", "CAMINHAO", "REBOQUE", "OUTRO"].includes(categoria)) {
      return;
    }

    setForm((anterior) => ({
      ...anterior,
      categoriaCobranca: categoria,
    }));
  }





  // =========================================================



  // SELECIONAR IMAGENS



  // =========================================================







  function handleImagens(event) {



    const arquivos = Array.from(event.target.files || []);







    const imagensValidas = arquivos.filter((arquivo) => {



      const ehImagem = arquivo.type.startsWith("image/");



      const tamanhoPermitido = arquivo.size <= 5 * 1024 * 1024;







      return ehImagem && tamanhoPermitido;



    });







    if (imagensValidas.length !== arquivos.length) {



      setErro(



        "Algumas imagens não foram adicionadas. Utilize imagens de até 5 MB."



      );



    } else {



      setErro("");



    }







    setImagens((anteriores) => {

      const novas = [...anteriores, ...imagensValidas];

      // Limite de 10 fotos
      return novas.slice(0, 10);

    });

    // Analisa automaticamente a primeira foto recém-anexada.
    if (imagensValidas.length > 0) {
      void analisarImagemComIa(imagensValidas[0]);
    }



    // Permite selecionar novamente o mesmo arquivo



    event.target.value = "";



  }







  // =========================================================



  // REMOVER IMAGEM



  // =========================================================







  function removerImagem(index) {

    const arquivoRemovido = imagens[index];

    limparAnaliseIaDaImagem(arquivoRemovido);

    setImagens((anteriores) =>
      anteriores.filter((_, indice) => indice !== index)
    );

  }

  function removerTodasImagens() {
    if (imagemAnalisadaIa) {
      limparAnaliseIaDaImagem(imagemAnalisadaIa);
    }

    setImagens([]);
  }







  // =========================================================



  // ENVIAR IMAGENS PARA O SUPABASE STORAGE



  // =========================================================







  async function enviarImagens() {

    if (imagens.length === 0) {

      return [];

    }



    // Confirma que existe uma sessão autenticada antes do upload.

    // O Storage usa o JWT desta sessão para avaliar as políticas RLS.

    const { data: sessaoData, error: sessaoError } =

      await supabase.auth.getSession();



    if (sessaoError) {

      throw sessaoError;

    }



    const usuario = sessaoData?.session?.user;



    if (!usuario) {

      throw new Error(

        "Sua sessão expirou. Entre novamente no sistema antes de enviar imagens."

      );

    }



    const urls = [];



    // Salva cada cadastro dentro da pasta do usuário autenticado.

    // Ex.: <user-id>/<uuid-do-cadastro>/arquivo.jpg

    // Isso também funciona com políticas RLS que validam a primeira pasta pelo auth.uid().

    const pastaVeiculo = `${usuario.id}/${crypto.randomUUID()}`;



    for (let i = 0; i < imagens.length; i++) {

      const arquivo = imagens[i];



      const extensao =

        arquivo.name.split(".").pop()?.toLowerCase() || "jpg";



      const nomeArquivo = `${Date.now()}-${i}-${crypto.randomUUID()}.${extensao}`;

      const caminho = `${pastaVeiculo}/${nomeArquivo}`;



      const { error: uploadError } = await supabase.storage

        .from("veiculos")

        .upload(caminho, arquivo, {

          cacheControl: "3600",

          upsert: false,

          contentType: arquivo.type || undefined,

        });



      if (uploadError) {

        const mensagemRls = String(uploadError.message || "").toLowerCase();



        if (mensagemRls.includes("row-level security")) {

          throw new Error(

            `Erro ao enviar a imagem ${arquivo.name}: o Supabase bloqueou o upload pela política de segurança do bucket veiculos. Confirme que a sessão está autenticada e execute o SQL de políticas fornecido.`

          );

        }



        throw new Error(

          `Erro ao enviar a imagem ${arquivo.name}: ${uploadError.message}`

        );

      }



      const { data: publicUrlData } = supabase.storage

        .from("veiculos")

        .getPublicUrl(caminho);



      if (publicUrlData?.publicUrl) {

        urls.push(publicUrlData.publicUrl);

      }

    }



    return urls;

  }



  // =========================================================



  // CADASTRAR VEÍCULO



  // =========================================================







  async function handleSubmit(event) {



    event.preventDefault();







    setErro("");



    setSucesso("");







    // ---------------------------------------------------------



    // VALIDAÇÕES



    // ---------------------------------------------------------







    if (!form.placa.trim()) {



      setErro("A placa do veículo é obrigatória.");



      return;



    }







    if (carregandoContextoPatio) {



      setErro("Aguarde o carregamento das informações do pátio.");



      return;



    }







    if (!patioSelecionadoId) {



      setErro(



        ehMaster



          ? "Selecione o pátio responsável por este veículo."



          : "Seu usuário não possui um pátio vinculado."



      );



      return;



    }







    if (form.ano) {



      const ano = Number(form.ano);







      if (ano < 1900 || ano > 2100) {



        setErro("Informe um ano válido.");



        return;



      }



    }







    if (carregandoTarifa) {



      setErro("Aguarde o carregamento do valor da diária.");



      return;



    }







    if (!tarifaEncontrada) {



      setErro(



        "Não existe uma diária cadastrada para " + form.categoriaCobranca + " neste pátio. Cadastre o valor na página Pátios antes de continuar."



      );



      return;



    }







    try {



      setSalvando(true);







      // -------------------------------------------------------



      // 1. ENVIA AS IMAGENS



      // -------------------------------------------------------







      const urlsImagens = await enviarImagens();







      // -------------------------------------------------------



      // 2. CADASTRA O VEÍCULO



      // -------------------------------------------------------







      const { data, error } = await supabase



        .from("veiculos")



        .insert({



          placa: form.placa.trim().toUpperCase(),







          renavam:



            form.renavam.trim() || null,







          chassi:



            form.chassi.trim().toUpperCase() || null,







          marca:



            form.marca.trim() || null,







          modelo:



            form.modelo.trim() || null,







          cor:



            form.cor.trim() || null,







          ano:



            form.ano ? Number(form.ano) : null,







          proprietario:



            form.proprietario.trim() || null,







          // Pátio vinculado ao sistema



          patio_id:



            Number(patioSelecionadoId),







          // Campo antigo mantido para compatibilidade com o que já existe



          patio:



            patioSelecionado?.nome || form.patio.trim() || null,







          // Tarifa congelada no momento da entrada do veículo.



          // Mudanças futuras no valor do pátio não alteram este cadastro.



          categoria_cobranca:



            form.categoriaCobranca,







          valor_diaria_aplicada:



            Number(valorDiaria || 0),







          status:



            form.status,







          observacoes:



            form.observacoes.trim() || null,







          fotos:



            urlsImagens,



        })



        .select()



        .single();







      if (error) {



        throw error;



      }







      console.log("Veículo cadastrado:", data);







      setSucesso("Veículo cadastrado com sucesso!");







      // -------------------------------------------------------



      // 3. LIMPA O FORMULÁRIO



      // -------------------------------------------------------







      setForm({



        placa: "",



        renavam: "",



        chassi: "",



        marca: "",



        modelo: "",



        cor: "",



        ano: "",



        proprietario: "",



        patio: ehMaster ? "" : patioSelecionado?.nome || "",



        categoriaCobranca: "CARRO",



        status: "EM_PATIO",



        observacoes: "",



      });







      setValorDiaria(null);



      setTarifaEncontrada(false);



      setImagens([]);
      setAnaliseIa(null);
      setErroIa("");
      setImagemAnalisadaIa(null);
      setCamposPreenchidosIa({});







      // -------------------------------------------------------



      // 4. VOLTA PARA VEÍCULOS



      // -------------------------------------------------------







      setTimeout(() => {



        navigate("/vehicles");



      }, 1000);



    } catch (error) {



      console.error("Erro ao cadastrar veículo:", error);







      setErro(



        error.message ||



          "Não foi possível cadastrar o veículo."



      );



    } finally {



      setSalvando(false);



    }



  }







  // =========================================================



  // INTERFACE



  // =========================================================







  return (



    <div className="p-6">







      {/* =====================================================



          CABEÇALHO



      ====================================================== */}







      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">







        <div>



          <h1 className="text-3xl font-bold text-slate-900">



            Cadastrar veículo



          </h1>







          <p className="mt-1 text-slate-500">



            Preencha as informações e adicione as fotos do veículo.



          </p>



        </div>







        <button



          type="button"



          onClick={() => navigate("/vehicles")}



          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"



        >



          Voltar



        </button>







      </div>







      {/* =====================================================



          MENSAGEM DE ERRO



      ====================================================== */}







      {erro && (



        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">



          {erro}



        </div>



      )}







      {/* =====================================================



          MENSAGEM DE SUCESSO



      ====================================================== */}







      {sucesso && (



        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700">



          {sucesso}



        </div>



      )}







      {/* =====================================================



          FORMULÁRIO



      ====================================================== */}







      <form



        onSubmit={handleSubmit}



        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"



      >







        {/* ===================================================



            DADOS DO VEÍCULO



        ==================================================== */}







        <div className="mb-6">



          <h2 className="text-xl font-bold text-slate-900">



            Dados do veículo



          </h2>







          <p className="mt-1 text-sm text-slate-500">



            Informações de identificação do veículo.



          </p>



        </div>







        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">







          {/* PLACA */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Placa *



            </label>







            <input



              type="text"



              name="placa"



              value={form.placa}



              onChange={handleChange}



              placeholder="ABC1D23"



              maxLength={10}



              required



              className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* RENAVAM */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Renavam



            </label>







            <input



              type="text"



              name="renavam"



              value={form.renavam}



              onChange={handleChange}



              placeholder="Digite o Renavam"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* CHASSI */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Chassi



            </label>







            <input



              type="text"



              name="chassi"



              value={form.chassi}



              onChange={handleChange}



              placeholder="Digite o chassi"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* MARCA */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Marca



            </label>







            <input



              type="text"



              name="marca"



              value={form.marca}



              onChange={handleChange}



              placeholder="Ex: Volkswagen"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* MODELO */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Modelo



            </label>







            <input



              type="text"



              name="modelo"



              value={form.modelo}



              onChange={handleChange}



              placeholder="Ex: Gol"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* COR */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Cor



            </label>







            <input



              type="text"



              name="cor"



              value={form.cor}



              onChange={handleChange}



              placeholder="Ex: Prata"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* ANO */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Ano



            </label>







            <input



              type="number"



              name="ano"



              value={form.ano}



              onChange={handleChange}



              placeholder="2026"



              min="1900"



              max="2100"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* PROPRIETÁRIO */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Proprietário



            </label>







            <input



              type="text"



              name="proprietario"



              value={form.proprietario}



              onChange={handleChange}



              placeholder="Nome do proprietário"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* PÁTIO VINCULADO AO SISTEMA */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Pátio do sistema *



            </label>







            <select



              value={patioSelecionadoId}



              onChange={handlePatioSelecionado}



              disabled={!ehMaster || carregandoContextoPatio}



              required



              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100 disabled:text-slate-500"



            >



              <option value="">



                {carregandoContextoPatio



                  ? "Carregando pátios..."



                  : "Selecione o pátio"}



              </option>







              {patios.map((patio) => (



                <option key={patio.id} value={patio.id}>



                  {patio.nome}



                  {patio.cidade ? ` - ${patio.cidade}` : ""}



                </option>



              ))}



            </select>







            <p className="mt-2 text-xs text-slate-500">



              {ehMaster



                ? "Como MASTER, você pode escolher em qual pátio o veículo será cadastrado."



                : "O pátio é definido automaticamente conforme o seu usuário."}



            </p>



          </div>







          {/* PÁTIO */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Pátio



            </label>







            <input



              type="text"



              name="patio"



              value={form.patio}



              onChange={handleChange}



              placeholder="Ex: Pátio Central"



              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            />



          </div>







          {/* CATEGORIA DE COBRANÇA */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Categoria da diária *



            </label>







            <select



              name="categoriaCobranca"



              value={form.categoriaCobranca}



              onChange={handleChange}



              required



              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            >



              <option value="MOTO">Moto</option>



              <option value="CARRO">Carro</option>



              <option value="CAMINHAO">Caminhão</option>



              <option value="REBOQUE">Reboque</option>



              <option value="OUTRO">Outro</option>



            </select>







            <p className="mt-2 text-xs text-slate-500">



              A categoria define qual valor de diária será usado para este veículo.



            </p>



          </div>







          {/* STATUS */}







          <div>



            <label className="mb-2 block text-sm font-semibold text-slate-700">



              Status



            </label>







            <select



              name="status"



              value={form.status}



              onChange={handleChange}



              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



            >



              <option value="EM_PATIO">



                Em pátio



              </option>







              <option value="EM_ANALISE">



                Em análise



              </option>







              <option value="LIBERADO">



                Liberado



              </option>







              <option value="LEILAO">



                Leilão



              </option>







              <option value="JUDICIAL">



                Judicial



              </option>







              <option value="OUTRO_DESTINO">



                Outro destino



              </option>



            </select>



          </div>







        </div>







        {/* ===================================================



            VALOR DA DIÁRIA



        ==================================================== */}







        <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5">



          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">



            <div>



              <p className="text-xs font-black uppercase tracking-wide text-slate-400">



                Diária do pátio



              </p>







              <h2 className="mt-1 text-lg font-bold text-slate-900">



                Valor aplicado a este veículo



              </h2>







              <p className="mt-1 text-sm text-slate-500">



                O valor é buscado automaticamente conforme o pátio e a categoria selecionados.



              </p>



            </div>







            <div className="min-w-[190px] rounded-xl border border-[#FFC400] bg-[#211E1F] px-5 py-4 text-right">



              <p className="text-xs font-black uppercase text-[#FFC400]">



                Valor da diária



              </p>







              <p className="mt-1 text-2xl font-black text-white">



                {carregandoTarifa



                  ? "Carregando..."



                  : tarifaEncontrada



                  ? formatarMoeda(valorDiaria)



                  : "Não cadastrada"}



              </p>



            </div>



          </div>







          {!carregandoTarifa && patioSelecionadoId && !tarifaEncontrada && (



            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">



              Não existe valor cadastrado para {form.categoriaCobranca} neste pátio. Vá em Pátios e informe a diária antes de cadastrar o veículo.



            </div>



          )}







          {tarifaEncontrada && (



            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">



              Este valor será salvo em <strong>valor_diaria_aplicada</strong> e ficará congelado neste veículo, mesmo que a tarifa do pátio seja alterada no futuro.



            </div>



          )}



        </div>







        {/* ===================================================



            OBSERVAÇÕES



        ==================================================== */}







        <div className="mt-8">







          <label className="mb-2 block text-sm font-semibold text-slate-700">



            Observações



          </label>







          <textarea



            name="observacoes"



            value={form.observacoes}



            onChange={handleChange}



            rows="5"



            placeholder="Digite informações adicionais sobre o veículo..."



            className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"



          />







        </div>







        {/* ===================================================



            IMAGENS



        ==================================================== */}







        <div className="mt-8 border-t border-slate-200 pt-8">







          <div className="mb-5">







            <h2 className="text-xl font-bold text-slate-900">



              Fotos do veículo



            </h2>







            <p className="mt-1 text-sm text-slate-500">



              Adicione até 10 imagens. Cada arquivo pode ter no máximo 5 MB. A primeira foto anexada será analisada automaticamente pela IA.



            </p>







          </div>







          {/* SELETOR */}







          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center transition hover:border-blue-500 hover:bg-blue-50">







            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-3xl text-blue-600">



              +



            </div>







            <span className="font-semibold text-slate-800">



              Adicionar fotos



            </span>







            <span className="mt-1 text-sm text-slate-500">



              Clique para selecionar JPG, PNG ou WEBP



            </span>







            <input



              type="file"



              accept="image/*"



              multiple



              onChange={handleImagens}



              className="hidden"



            />







          </label>







          {/* ANÁLISE COM IA */}
          <div className="mt-5 rounded-2xl border border-[#E7E2E3] bg-[#F5F5F4] p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[#7A6B00]">
                  ✨ Validação inteligente
                </p>
                <h3 className="mt-1 text-lg font-black text-[#211E1F]">
                  Identificação automática do veículo
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  A IA confere o tipo escolhido e tenta identificar placa, marca, modelo e cor. Sempre confirme a placa antes de salvar.
                </p>
              </div>

              {analisandoIa && (
                <span className="inline-flex shrink-0 items-center rounded-full bg-[#FFF4B8] px-3 py-2 text-xs font-black text-[#211E1F]">
                  Analisando imagem...
                </span>
              )}
            </div>

            {erroIa && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erroIa}
              </div>
            )}

            {analiseIa && !erroIa && (
              <div
                className={`mt-4 rounded-xl border p-4 ${
                  !analiseIa.veiculo_detectado
                    ? "border-red-200 bg-red-50"
                    : analiseIa.tipo_compativel
                    ? "border-green-200 bg-green-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-black text-slate-900">
                      {!analiseIa.veiculo_detectado
                        ? "Não foi possível confirmar um veículo nesta foto"
                        : analiseIa.tipo_compativel
                        ? "✅ Tipo de veículo compatível"
                        : "⚠️ Tipo de veículo diferente do selecionado"}
                    </p>

                    {analiseIa.veiculo_detectado && (
                      <p className="mt-1 text-sm text-slate-700">
                        Selecionado: <strong>{form.categoriaCobranca}</strong> · Detectado: <strong>{analiseIa.tipo || "-"}</strong>
                        {typeof analiseIa.confianca_tipo === "number"
                          ? ` · Confiança estimada: ${Math.round(analiseIa.confianca_tipo * 100)}%`
                          : ""}
                      </p>
                    )}
                  </div>

                  {analiseIa.veiculo_detectado &&
                    !analiseIa.tipo_compativel &&
                    ["CARRO", "MOTO", "CAMINHAO", "REBOQUE", "OUTRO"].includes(analiseIa.tipo) && (
                      <button
                        type="button"
                        onClick={usarCategoriaDetectada}
                        className="shrink-0 rounded-lg bg-[#211E1F] px-4 py-2 text-sm font-black text-[#FFC400] transition hover:bg-black"
                      >
                        Usar {analiseIa.tipo}
                      </button>
                    )}
                </div>

                {analiseIa.veiculo_detectado && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg bg-white/80 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Placa</p>
                      <p className="mt-1 font-black text-slate-800">{analiseIa.placa || "Não legível"}</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Marca</p>
                      <p className="mt-1 font-black text-slate-800">{analiseIa.marca || "Não identificada"}</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Modelo</p>
                      <p className="mt-1 font-black text-slate-800">{analiseIa.modelo || "Não identificado"}</p>
                    </div>
                    <div className="rounded-lg bg-white/80 p-3">
                      <p className="text-xs font-bold uppercase text-slate-400">Cor</p>
                      <p className="mt-1 font-black text-slate-800">{analiseIa.cor || "Não identificada"}</p>
                    </div>
                  </div>
                )}

                {analiseIa.observacao && (
                  <p className="mt-3 text-xs leading-5 text-slate-600">
                    {analiseIa.observacao}
                  </p>
                )}
              </div>
            )}
          </div>


          {/* PRÉ-VISUALIZAÇÃO */}







          {imagens.length > 0 && (







            <div className="mt-7">







              <div className="mb-4 flex items-center justify-between">







                <p className="font-semibold text-slate-700">



                  {imagens.length} de 10 imagens selecionadas



                </p>







                <button



                  type="button"



                  onClick={removerTodasImagens}



                  className="text-sm font-semibold text-red-600 hover:text-red-700"



                >



                  Remover todas



                </button>







              </div>







              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">







                {imagens.map((imagem, index) => (







                  <div



                    key={`${imagem.name}-${index}`}



                    className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"



                  >







                    <img



                      src={URL.createObjectURL(imagem)}



                      alt={`Foto ${index + 1}`}



                      className="h-44 w-full object-cover"



                    />







                    {/* PRIMEIRA FOTO */}







                    {index === 0 && (



                      <div className="absolute left-2 top-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">



                        Foto principal



                      </div>



                    )}







                    {/* REMOVER */}







                    <button



                      type="button"



                      onClick={() => removerImagem(index)}



                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 font-bold text-white shadow transition hover:bg-red-700"



                    >



                      ×



                    </button>







                    <div className="p-3">







                      <p className="truncate text-sm font-medium text-slate-700">



                        {imagem.name}



                      </p>







                      <p className="mt-1 text-xs text-slate-400">



                        {(imagem.size / 1024 / 1024).toFixed(2)} MB



                      </p>

                      <button
                        type="button"
                        disabled={analisandoIa}
                        onClick={() => analisarImagemComIa(imagem)}
                        className="mt-3 w-full rounded-lg border border-[#FFC400] bg-[#FFF8D6] px-3 py-2 text-xs font-black text-[#211E1F] transition hover:bg-[#FFC400] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {analisandoIa && imagemAnalisadaIa === imagem
                          ? "Analisando..."
                          : "✨ Analisar com IA"}
                      </button>







                    </div>







                  </div>







                ))}







              </div>







            </div>







          )}







        </div>







        {/* ===================================================



            BOTÕES



        ==================================================== */}







        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">







          <button



            type="button"



            disabled={salvando}



            onClick={() => navigate("/vehicles")}



            className="rounded-lg border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"



          >



            Cancelar



          </button>







          <button



            type="submit"



            disabled={salvando}



            className="rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"



          >



            {salvando



              ? "Salvando veículo..."



              : "Cadastrar veículo"}



          </button>







        </div>







      </form>







    </div>



  );



}







export default CadastrarVeiculo;