import React, { useState, useEffect, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  Timestamp,
  increment,
} from "firebase/firestore";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import {
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  Filter,
  X,
  LayoutDashboard,
  List as ListIcon,
  Calendar,
  LogOut,
  LogIn,
  Moon,
  Sun,
  Target,
  Download,
  FileText,
  Minus,
  Edit2,
  User,
} from "lucide-react";

// ============================================================================
// ⚠️ CONFIGURAÇÃO DO FIREBASE (COLE SUAS CHAVES AQUI) ⚠️
// ============================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAjp4wPC8RrgkAWWWbkomUxsRYNQEfksKI",
  authDomain: "controle-financeiro---fantha.firebaseapp.com",
  projectId: "controle-financeiro---fantha",
  storageBucket: "controle-financeiro---fantha.firebasestorage.app",
  messagingSenderId: "296776506950",
  appId: "1:296776506950:web:ef1841b4cd4517b8843447",
};

// ============================================================================
// 👪 CONFIGURAÇÃO DA FAMÍLIA (Mapeamento de E-mails para Nomes)
// ============================================================================
const EMAILS_FAMILIA = {
  "fanuelbergson@gmail.com": "Fanuel", // Substitua pelo seu e-mail real
  "arethakellen@gmail.com": "Aretha", // Substitua pelo e-mail real dela
};

// Função para pegar o nome personalizado
const getNomeUsuario = (user) => {
  if (!user || !user.email) return "Visitante";
  return EMAILS_FAMILIA[user.email] || user.displayName.split(" ")[0];
};
// ============================================================================

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const COLECAO_PUBLIC = "familia_fantha_v1";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#ff6b6b",
  "#1dd1a1",
  "#2f3542",
  "#a4b0be",
  "#ff4757",
  "#747d8c",
  "#5352ed",
  "#eccc68",
  "#7bed9f",
];

// Categorias Atualizadas (Cemig, Copasa e Ordem Alfabética)
const CATEGORIAS = [
  "Alimentação",
  "Cemig", // Antiga Luz
  "Combustível",
  "Compra Mensal",
  "Compra Semanal",
  "Copasa", // Antiga Água
  "Educação",
  "Extra",
  "Internet",
  "Investimentos",
  "Lazer",
  "Moradia",
  "Outros",
  "Salário",
  "Saúde",
  "Transporte",
];

export default function App() {
  const [user, setUser] = useState(null);
  const [transacoes, setTransacoes] = useState([]);
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Estados UI
  const [view, setView] = useState("dashboard");
  const [modalAberto, setModalAberto] = useState(false);

  // Estados Metas
  const [modalMetaAberto, setModalMetaAberto] = useState(false);
  const [modalMovimentoMeta, setModalMovimentoMeta] = useState(null);
  const [modalEdicaoMeta, setModalEdicaoMeta] = useState(null);

  // Form Transação
  const [tipo, setTipo] = useState("despesa");
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("Alimentação");
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);

  // Form Meta
  const [nomeMeta, setNomeMeta] = useState("");
  const [valorAlvo, setValorAlvo] = useState("");
  const [valorMovimento, setValorMovimento] = useState("");
  const [tipoMovimentoMeta, setTipoMovimentoMeta] = useState("adicionar");

  // Form Edição Meta (Nome e Valor)
  const [editNomeMeta, setEditNomeMeta] = useState("");
  const [editValorMeta, setEditValorMeta] = useState("");

  const [mesesSelecionados, setMesesSelecionados] = useState([]);

  // --- Design Automático ---
  useEffect(() => {
    if (!document.getElementById("tailwind-script")) {
      const script = document.createElement("script");
      script.id = "tailwind-script";
      script.src = "https://cdn.tailwindcss.com";
      script.onload = () => {
        if (window.tailwind) window.tailwind.config = { darkMode: "class" };
      };
      document.head.appendChild(script);
    }
    const salvo = localStorage.getItem("theme");
    if (salvo === "dark") setDarkMode(true);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // --- Autenticação ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      alert("Erro ao logar: " + error.message);
    }
  };
  const sair = () => signOut(auth);

  // --- Carregar Dados ---
  useEffect(() => {
    if (!user) return;

    const qTransacoes = query(
      collection(
        db,
        "artifacts",
        COLECAO_PUBLIC,
        "public",
        "data",
        "transacoes"
      ),
      orderBy("data", "desc")
    );
    const unsubTransacoes = onSnapshot(qTransacoes, (snapshot) => {
      const dados = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTransacoes(dados);
    });

    const qMetas = query(
      collection(db, "artifacts", COLECAO_PUBLIC, "public", "data", "metas"),
      orderBy("criadoEm", "desc")
    );
    const unsubMetas = onSnapshot(qMetas, (snapshot) => {
      setMetas(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubTransacoes();
      unsubMetas();
    };
  }, [user]);

  // --- Funções CRUD ---
  const adicionarTransacao = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const autor = getNomeUsuario(user);
      await addDoc(
        collection(
          db,
          "artifacts",
          COLECAO_PUBLIC,
          "public",
          "data",
          "transacoes"
        ),
        {
          tipo,
          valor: parseFloat(valor),
          descricao,
          categoria,
          data,
          mesAno: data.slice(0, 7),
          criadoEm: Timestamp.now(),
          autor: autor,
          autorId: user.uid,
        }
      );
      setValor("");
      setDescricao("");
      setModalAberto(false);
    } catch (error) {
      alert("Erro ao salvar.");
    }
  };

  const deletarTransacao = async (id) => {
    if (confirm("Excluir transação?"))
      await deleteDoc(
        doc(db, "artifacts", COLECAO_PUBLIC, "public", "data", "transacoes", id)
      );
  };

  const criarMeta = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const autor = getNomeUsuario(user);
      await addDoc(
        collection(db, "artifacts", COLECAO_PUBLIC, "public", "data", "metas"),
        {
          nome: nomeMeta,
          alvo: parseFloat(valorAlvo),
          saldo: 0,
          criadoEm: Timestamp.now(),
          autor: autor,
        }
      );
      setNomeMeta("");
      setValorAlvo("");
      setModalMetaAberto(false);
    } catch (error) {
      alert("Erro ao criar meta.");
    }
  };

  const movimentarMeta = async (e) => {
    e.preventDefault();
    if (!user || !modalMovimentoMeta) return;
    try {
      const valor = parseFloat(valorMovimento);
      const ajuste = tipoMovimentoMeta === "adicionar" ? valor : -valor;
      const metaRef = doc(
        db,
        "artifacts",
        COLECAO_PUBLIC,
        "public",
        "data",
        "metas",
        modalMovimentoMeta.id
      );

      const autor = getNomeUsuario(user);
      await updateDoc(metaRef, {
        saldo: increment(ajuste),
        ultimoAutor: autor,
      });
      setValorMovimento("");
      setModalMovimentoMeta(null);
    } catch (error) {
      alert("Erro ao atualizar meta.");
    }
  };

  const editarMetaCompleta = async (e) => {
    e.preventDefault();
    if (!user || !modalEdicaoMeta) return;
    try {
      const metaRef = doc(
        db,
        "artifacts",
        COLECAO_PUBLIC,
        "public",
        "data",
        "metas",
        modalEdicaoMeta.id
      );
      await updateDoc(metaRef, {
        nome: editNomeMeta,
        alvo: parseFloat(editValorMeta),
      });
      setModalEdicaoMeta(null);
      setEditNomeMeta("");
      setEditValorMeta("");
    } catch (error) {
      alert("Erro ao editar.");
    }
  };

  const deletarMeta = async (id) => {
    if (confirm("Excluir esta meta?"))
      await deleteDoc(
        doc(db, "artifacts", COLECAO_PUBLIC, "public", "data", "metas", id)
      );
  };

  // --- Exportação ---
  const exportarCSV = () => {
    let csvContent =
      "data:text/csv;charset=utf-8,Data,Descrição,Categoria,Tipo,Valor,Autor\n";
    transacoesFiltradas.forEach((t) => {
      csvContent += `${formatarData(t.data)},${t.descricao},${t.categoria},${
        t.tipo
      },${t.valor.toFixed(2)},${t.autor || ""}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "financas_familia.csv");
    document.body.appendChild(link);
    link.click();
  };

  const exportarPDF = () => {
    window.print();
  };

  // --- Cálculos ---
  const mesesDisponiveis = useMemo(
    () =>
      Array.from(new Set(transacoes.map((t) => t.mesAno)))
        .sort()
        .reverse(),
    [transacoes]
  );

  const transacoesFiltradas = useMemo(() => {
    if (mesesSelecionados.length === 0) return transacoes;
    return transacoes.filter((t) => mesesSelecionados.includes(t.mesAno));
  }, [transacoes, mesesSelecionados]);

  const dadosDashboard = useMemo(() => {
    if (view === "dashboard" && mesesSelecionados.length === 0) {
      const hoje = new Date().toISOString().slice(0, 7);
      return transacoes.filter((t) => t.mesAno === hoje);
    }
    return transacoesFiltradas;
  }, [transacoesFiltradas, transacoes, view, mesesSelecionados]);

  const resumo = useMemo(
    () =>
      transacoesFiltradas.reduce(
        (acc, curr) => {
          if (curr.tipo === "receita") acc.receitas += curr.valor;
          else acc.despesas += curr.valor;
          return acc;
        },
        { receitas: 0, despesas: 0 }
      ),
    [transacoesFiltradas]
  );
  const saldo = resumo.receitas - resumo.despesas;

  const dadosGrafico = useMemo(() => {
    const dadosParaGrafico =
      view === "dashboard" ? dadosDashboard : transacoesFiltradas;
    const map = {};
    dadosParaGrafico
      .filter((t) => t.tipo === "despesa")
      .forEach((t) => {
        if (!map[t.categoria]) map[t.categoria] = 0;
        map[t.categoria] += t.valor;
      });
    return Object.keys(map)
      .map((k) => ({ name: k, value: map[k] }))
      .sort((a, b) => b.value - a.value);
  }, [transacoesFiltradas, dadosDashboard, view]);

  // --- UI Aux ---
  const toggleMes = (mes) =>
    setMesesSelecionados((p) =>
      p.includes(mes) ? p.filter((m) => m !== mes) : [...p, mes]
    );
  const formatarMoeda = (v) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(v);
  const formatarData = (d) => {
    const [a, m, dia] = d.split("-");
    return `${dia}/${m}/${a}`;
  };
  const formatarMes = (ma) => {
    const [a, m] = ma.split("-");
    const ms = [
      "Jan",
      "Fev",
      "Mar",
      "Abr",
      "Mai",
      "Jun",
      "Jul",
      "Ago",
      "Set",
      "Out",
      "Nov",
      "Dez",
    ];
    return `${ms[parseInt(m) - 1]} ${a}`;
  };

  // --- TELA DE LOGIN ---
  if (!user && !loading) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen bg-slate-900 p-6 text-center"
        translate="no"
      >
        <Wallet className="w-20 h-20 text-emerald-400 mb-6" />
        <h1 className="text-3xl font-bold text-white mb-2">
          Controle Financeiro
        </h1>
        <p className="text-slate-400 mb-8">
          Faça login para acessar a conta conjunta.
        </p>
        <button
          onClick={loginGoogle}
          className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 active:scale-95 transition-transform hover:bg-gray-100"
        >
          <LogIn size={20} />
          Entrar com Google
        </button>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent"></div>
      </div>
    );

  return (
    <div
      className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans pb-24 text-slate-800 dark:text-slate-100 transition-colors duration-300 notranslate"
      translate="no"
    >
      <header className="bg-slate-900 dark:bg-black text-white p-6 rounded-b-3xl shadow-lg mb-6 sticky top-0 z-10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="text-emerald-400" />
            <h1 className="font-bold">Finanças</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full text-slate-400 hover:text-yellow-400 transition-colors"
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              onClick={sair}
              className="p-2 rounded-full text-slate-400 hover:text-red-400"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Info do Usuário com Nome Personalizado */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
          <User size={12} />
          <span>
            Logado como:{" "}
            <strong className="text-emerald-400">{getNomeUsuario(user)}</strong>
          </span>
        </div>

        <div className="mb-4">
          <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">
            Saldo Total{" "}
            {mesesSelecionados.length > 0 ? "(Filtrado)" : "(Geral)"}
          </p>
          <h2
            className={`text-4xl font-bold ${
              saldo >= 0 ? "text-white" : "text-red-400"
            }`}
          >
            {formatarMoeda(saldo)}
          </h2>
        </div>
        <div className="flex bg-slate-800 dark:bg-slate-900 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView("dashboard")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              view === "dashboard"
                ? "bg-emerald-500 text-white shadow-lg"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            <LayoutDashboard size={16} />{" "}
            <span className="hidden sm:inline">Visão Geral</span>
          </button>
          <button
            onClick={() => setView("lista")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              view === "lista"
                ? "bg-emerald-500 text-white shadow-lg"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            <ListIcon size={16} />{" "}
            <span className="hidden sm:inline">Extrato</span>
          </button>
          <button
            onClick={() => setView("metas")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              view === "metas"
                ? "bg-emerald-500 text-white shadow-lg"
                : "text-slate-400 hover:bg-slate-700"
            }`}
          >
            <Target size={16} /> <span className="hidden sm:inline">Metas</span>
          </button>
        </div>
      </header>

      <div className="px-4 max-w-3xl mx-auto">
        {view === "dashboard" && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {mesesSelecionados.length === 0 && (
              <p className="text-center text-xs text-slate-400 italic">
                Mostrando dados do mês atual. Selecione meses na lista para
                filtrar.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-emerald-500 mb-1">
                  <TrendingUp size={18} />
                  <span className="text-xs font-bold uppercase">Entradas</span>
                </div>
                <span className="text-xl font-bold text-slate-800 dark:text-white">
                  {formatarMoeda(resumo.receitas)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-2 text-red-500 mb-1">
                  <TrendingDown size={18} />
                  <span className="text-xs font-bold uppercase">Saídas</span>
                </div>
                <span className="text-xl font-bold text-slate-800 dark:text-white">
                  {formatarMoeda(resumo.despesas)}
                </span>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                Gastos por Categoria
              </h3>
              {dadosGrafico.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={dadosGrafico}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dadosGrafico.map((e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend />
                      <RechartsTooltip formatter={(v) => formatarMoeda(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-400 dark:text-slate-500 border-dashed border-2 dark:border-slate-700 rounded-xl">
                  Sem dados no período
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={exportarCSV}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download size={24} className="text-blue-500" />{" "}
                <span className="text-xs font-bold">Exportar Excel</span>
              </button>
              <button
                onClick={exportarPDF}
                className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileText size={24} className="text-orange-500" />{" "}
                <span className="text-xs font-bold">Imprimir PDF</span>
              </button>
            </div>
          </div>
        )}

        {view === "lista" && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {mesesDisponiveis.map((mes) => (
                <button
                  key={mes}
                  onClick={() => toggleMes(mes)}
                  className={`px-4 py-2 rounded-xl text-sm border whitespace-nowrap transition-colors ${
                    mesesSelecionados.includes(mes)
                      ? "bg-slate-800 dark:bg-emerald-500 text-white border-transparent"
                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700"
                  }`}
                >
                  {formatarMes(mes)}
                </button>
              ))}
            </div>

            {mesesSelecionados.length === 0 && (
              <p className="text-xs text-center text-slate-400 mb-2">
                Exibindo histórico completo. Selecione um mês para filtrar.
              </p>
            )}

            {transacoesFiltradas.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500 flex flex-col items-center gap-3">
                <ListIcon size={48} className="opacity-20" />
                <p>Nenhuma transação encontrada.</p>
              </div>
            ) : (
              transacoesFiltradas.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-2xl border flex justify-between items-center transition-all hover:scale-[1.01] ${
                    t.tipo === "receita"
                      ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30"
                      : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-gray-200">
                      {t.descricao}
                    </h4>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex gap-2 text-xs opacity-70 text-gray-600 dark:text-gray-400">
                        <span className="font-bold uppercase">
                          {t.categoria}
                        </span>
                        <span>• {formatarData(t.data)}</span>
                      </div>
                      {t.autor && (
                        <span className="text-[10px] text-slate-400 bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded w-fit border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <User size={10} /> {t.autor}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-bold block ${
                        t.tipo === "receita"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.tipo === "receita" ? "+" : "-"}{" "}
                      {formatarMoeda(t.valor)}
                    </span>
                    <button
                      onClick={() => deletarTransacao(t.id)}
                      className="text-gray-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 mt-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {view === "metas" && (
          <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <button
              onClick={() => setModalMetaAberto(true)}
              className="w-full bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-600 transition-all"
            >
              <Plus size={20} /> Criar Nova Meta
            </button>
            {metas.length === 0 ? (
              <div className="text-center py-12 text-gray-400 dark:text-slate-500 flex flex-col items-center gap-3">
                <Target size={48} className="opacity-20" />
                <p>Você ainda não tem metas.</p>
              </div>
            ) : (
              metas.map((m) => {
                const progresso = Math.min((m.saldo / m.alvo) * 100, 100);
                return (
                  <div
                    key={m.id}
                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 relative"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                            {m.nome}
                          </h3>
                          <button
                            onClick={() => {
                              setModalEdicaoMeta(m);
                              setEditNomeMeta(m.nome);
                              setEditValorMeta(m.alvo);
                            }}
                            className="text-slate-400 hover:text-blue-500"
                          >
                            <Edit2 size={14} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Objetivo: {formatarMoeda(m.alvo)}
                        </p>
                        {m.autor && (
                          <p className="text-[10px] text-slate-400 mt-1">
                            Criado por: {m.autor}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deletarMeta(m.id)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1 font-semibold">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {formatarMoeda(m.saldo)}
                        </span>
                        <span className="text-slate-400">
                          {progresso.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-3 rounded-full transition-all duration-1000"
                          style={{ width: `${progresso}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setModalMovimentoMeta(m);
                          setTipoMovimentoMeta("adicionar");
                        }}
                        className="flex-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                      >
                        <Plus size={16} /> Guardar
                      </button>
                      <button
                        onClick={() => {
                          setModalMovimentoMeta(m);
                          setTipoMovimentoMeta("retirar");
                        }}
                        className="flex-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                      >
                        <Minus size={16} /> Retirar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {view !== "metas" && (
        <button
          onClick={() => setModalAberto(true)}
          className="fixed bottom-6 right-6 bg-slate-900 dark:bg-emerald-500 text-white p-4 rounded-full shadow-2xl hover:bg-slate-800 dark:hover:bg-emerald-600 active:scale-95 transition-all z-50"
        >
          <Plus size={28} />
        </button>
      )}

      {/* Modal Transação */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl border-t border-gray-100 dark:border-slate-700 animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Nova Transação
              </h2>
              <button
                onClick={() => setModalAberto(false)}
                className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={adicionarTransacao} className="space-y-4">
              <div className="flex gap-2 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setTipo("despesa")}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    tipo === "despesa"
                      ? "bg-white dark:bg-slate-600 text-red-500 shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setTipo("receita")}
                  className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all ${
                    tipo === "receita"
                      ? "bg-white dark:bg-slate-600 text-emerald-500 shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                  }`}
                >
                  Receita
                </button>
              </div>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full text-4xl font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-gray-200 dark:border-slate-600 focus:border-slate-800 dark:focus:border-emerald-500 outline-none py-2 placeholder-gray-300 dark:placeholder-slate-600"
              />
              <input
                type="text"
                required
                placeholder="Descrição"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-slate-800/20 dark:focus:ring-emerald-500/30"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  required
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-slate-800/20 dark:focus:ring-emerald-500/30"
                />
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl outline-none focus:ring-2 focus:ring-slate-800/20 dark:focus:ring-emerald-500/30 appearance-none"
                >
                  {CATEGORIAS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className={`w-full py-4 rounded-xl text-white font-bold text-lg mt-4 shadow-lg active:scale-95 transition-all ${
                  tipo === "receita"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-red-500 hover:bg-red-600"
                }`}
              >
                Salvar
              </button>
            </form>
          </div>
        </div>
      )}

      {modalMetaAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Nova Meta
              </h2>
              <button
                onClick={() => setModalMetaAberto(false)}
                className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={criarMeta} className="space-y-4">
              <input
                type="text"
                required
                placeholder="Nome do objetivo (ex: Viagem)"
                value={nomeMeta}
                onChange={(e) => setNomeMeta(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl outline-none"
              />
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 ml-1 uppercase">
                  Valor Alvo
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={valorAlvo}
                  onChange={(e) => setValorAlvo(e.target.value)}
                  className="w-full text-3xl font-bold text-slate-800 dark:text-white bg-transparent border-b-2 border-gray-200 dark:border-slate-600 outline-none py-2"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-bold text-lg mt-4 shadow-lg active:scale-95 transition-all"
              >
                Criar Meta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição Meta Completa */}
      {modalEdicaoMeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Editar Meta
              </h2>
              <button
                onClick={() => setModalEdicaoMeta(null)}
                className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={editarMetaCompleta} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={editNomeMeta}
                  onChange={(e) => setEditNomeMeta(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase">
                  Valor Alvo
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={editValorMeta}
                  onChange={(e) => setEditValorMeta(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-slate-700 dark:text-white rounded-xl outline-none mt-1"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 rounded-xl bg-slate-900 dark:bg-emerald-500 text-white font-bold text-lg mt-4 shadow-lg active:scale-95 transition-all"
              >
                Salvar Alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {modalMovimentoMeta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-800 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {tipoMovimentoMeta === "adicionar"
                  ? "Guardar Dinheiro"
                  : "Retirar Dinheiro"}
              </h2>
              <button
                onClick={() => setModalMovimentoMeta(null)}
                className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-gray-300"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Meta: <span className="font-bold">{modalMovimentoMeta.nome}</span>
            </p>
            <form onSubmit={movimentarMeta} className="space-y-4">
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={valorMovimento}
                onChange={(e) => setValorMovimento(e.target.value)}
                autoFocus
                className="w-full text-4xl font-bold text-center text-slate-800 dark:text-white bg-transparent border-b-2 border-gray-200 dark:border-slate-600 outline-none py-4"
              />
              <button
                type="submit"
                className={`w-full py-4 rounded-xl text-white font-bold text-lg mt-4 shadow-lg active:scale-95 transition-all ${
                  tipoMovimentoMeta === "adicionar"
                    ? "bg-emerald-500"
                    : "bg-red-500"
                }`}
              >
                Confirmar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
