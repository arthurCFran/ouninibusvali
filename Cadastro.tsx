import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { File } from 'expo-file-system';
import { fetch as expoFetch } from 'expo/fetch';

const API_URL = 'http://127.0.0.1:8000';
const LIMITE_PDF = 5 * 1024 * 1024;

type Props = {
  onVoltar: () => void;
};

type ArquivoPDF = {
  nome: string;
  tamanho: number;
  conteudo: ArrayBuffer;
};

type RespostaAPI = {
  status: number;
  json: () => Promise<unknown>;
};

type OpcoesRequisicao = NonNullable<
  Parameters<typeof expoFetch>[1]
>;

async function requisitar(
  caminho: string,
  opcoes: OpcoesRequisicao
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    return await expoFetch(`${API_URL}${caminho}`, {
      ...opcoes,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function mensagemErro(
  resposta: RespostaAPI
): Promise<string> {
  const dados: unknown = await resposta.json().catch(() => null);

  if (typeof dados === 'object' && dados !== null) {
    const detalhe = (dados as Record<string, unknown>).detail;

    if (typeof detalhe === 'string') {
      return detalhe;
    }
  }

  switch (resposta.status) {
    case 401:
      return 'E-mail ou senha incorretos.';

    case 403:
      return 'Essa conta não tem permissão para enviar comprovantes.';

    case 404:
      return 'A rota ou o usuário não foi encontrado na API.';

    case 405:
      return (
        'A rota PUT do comprovante não está disponível. ' +
        'Confira documentos.py e reinicie a API.'
      );

    case 409:
      return 'E-mail, CPF ou matrícula já cadastrado.';

    case 413:
      return 'O PDF deve ter no máximo 5 MB.';

    case 422:
      return (
        'Confira os dados: nome com pelo menos 3 caracteres, ' +
        'e-mail válido, CPF com 11 dígitos, matrícula e senha ' +
        'de 8 caracteres ou mais, limitada a 72 bytes.'
      );

    default:
      return `A API não concluiu a operação (${resposta.status}).`;
  }
}

function validarBytesPdf(bytes: Uint8Array) {
  if (bytes.byteLength === 0) {
    throw new Error('O arquivo está vazio.');
  }

  if (bytes.byteLength > LIMITE_PDF) {
    throw new Error('O PDF deve ter no máximo 5 MB.');
  }

  const assinaturaPdf = [37, 80, 68, 70, 45]; // %PDF-

  const possuiCabecalhoPdf = assinaturaPdf.every(
    (valor, indice) => bytes[indice] === valor
  );

  if (!possuiCabecalhoPdf) {
    throw new Error('O arquivo não possui um cabeçalho PDF válido.');
  }
}

export default function Cadastro({ onVoltar }: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [matricula, setMatricula] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacaoSenha, setConfirmacaoSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);

  const [arquivo, setArquivo] = useState<ArquivoPDF | null>(null);

  const [selecionando, setSelecionando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [contaCriada, setContaCriada] = useState(false);
  const [modoReenvio, setModoReenvio] = useState(false);
  const [concluido, setConcluido] = useState(false);

  // Impede dois toques de iniciarem operações simultâneas.
  const operacaoEmCurso = useRef(false);

  const apenasDocumento = contaCriada || modoReenvio;
  const ocupado = selecionando || enviando;

  async function selecionarPdf() {
    if (operacaoEmCurso.current) return;

    operacaoEmCurso.current = true;
    setSelecionando(true);

    try {
      const resultado = await File.pickFileAsync({
        mimeTypes: ['application/pdf'],
        multipleFiles: false,
      });

      if (resultado.canceled) return;

      const pdf = resultado.result;

      // Evita carregar um arquivo conhecido como muito grande.
      if (
        typeof pdf.size === 'number' &&
        pdf.size > LIMITE_PDF
      ) {
        throw new Error('O PDF deve ter no máximo 5 MB.');
      }

      // Testa a leitura real. Não depende de pdf.exists.
      const bytes = await pdf.bytes();

      validarBytesPdf(bytes);

      const conteudo = new ArrayBuffer(bytes.byteLength);
      new Uint8Array(conteudo).set(bytes);

      setArquivo({
        nome: pdf.name || 'comprovante.pdf',
        tamanho: bytes.byteLength,
        conteudo,
      });
    } catch (erro) {
      Alert.alert(
        'Não foi possível selecionar',
        erro instanceof Error
          ? erro.message
          : 'Tente selecionar o PDF novamente.'
      );
    } finally {
      setSelecionando(false);
      operacaoEmCurso.current = false;
    }
  }

  function alternarModo() {
    if (operacaoEmCurso.current || contaCriada) return;

    setModoReenvio((anterior) => !anterior);
    setSenha('');
    setConfirmacaoSenha('');
    setMostrarSenha(false);
  }

  async function cadastrarOuEnviar() {
    if (operacaoEmCurso.current || concluido) return;

    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado || !senha || !arquivo) {
      Alert.alert(
        'Preencha os campos',
        'Informe e-mail, senha e selecione o comprovante PDF.'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      Alert.alert('E-mail inválido', 'Confira o e-mail informado.');
      return;
    }

    if (!apenasDocumento) {
      if (
        nome.trim().length < 3 ||
        !matricula.trim() ||
        cpf.length !== 11
      ) {
        Alert.alert(
          'Confira os dados',
          'Informe nome completo, matrícula e CPF com 11 dígitos.'
        );
        return;
      }

      if (senha.length < 8) {
        Alert.alert(
          'Senha muito curta',
          'Use pelo menos 8 caracteres.'
        );
        return;
      }

      if (senha !== confirmacaoSenha) {
        Alert.alert(
          'As senhas não conferem',
          'Digite a mesma senha nos dois campos.'
        );
        return;
      }
    }

    if (new TextEncoder().encode(senha).byteLength > 72) {
      Alert.alert(
        'Senha muito longa',
        'A senha deve ter no máximo 72 bytes.'
      );
      return;
    }

    operacaoEmCurso.current = true;
    setEnviando(true);

    let cadastroSalvo = contaCriada;
    let etapa = 'cadastro';

    try {
      if (!apenasDocumento) {
        const cadastro = await requisitar('/alunos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nome: nome.trim(),
            email: emailNormalizado,
            cpf,
            matricula: matricula.trim(),
            senha,
          }),
        });

        if (!cadastro.ok) {
          if (cadastro.status === 409) {
            Alert.alert(
              'Dados já cadastrados',
              'Se essa conta é sua, use a opção de conta existente para enviar o PDF.',
              [
                { text: 'Voltar', style: 'cancel' },
                {
                  text: 'Usar conta existente',
                  onPress: () => setModoReenvio(true),
                },
              ]
            );
            return;
          }

          throw new Error(await mensagemErro(cadastro));
        }

        cadastroSalvo = true;
        setContaCriada(true);
      }

      etapa = 'login';

      const login = await requisitar('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailNormalizado,
          senha,
        }),
      });

      if (!login.ok) {
        throw new Error(await mensagemErro(login));
      }

      const dados: unknown = await login.json();

      if (typeof dados !== 'object' || dados === null) {
        throw new Error('A API retornou um login inválido.');
      }

      const token = (dados as Record<string, unknown>).access_token;

      if (typeof token !== 'string' || !token) {
        throw new Error('A API não retornou um token válido.');
      }

      etapa = 'envio';

      // Usa os bytes já lidos na seleção.
      // Não acessa novamente o caminho temporário do arquivo.
      const envio = await requisitar('/alunos/me/comprovante', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/pdf',
        },
        body: arquivo.conteudo,
      });

      if (!envio.ok) {
        throw new Error(await mensagemErro(envio));
      }

      setSenha('');
      setConfirmacaoSenha('');
      setMostrarSenha(false);
      setArquivo(null);
      setConcluido(true);
    } catch (erro) {
      const detalhe =
        erro instanceof Error && erro.name === 'AbortError'
          ? 'O tempo de espera terminou. Confira a conexão com a API.'
          : erro instanceof Error
            ? erro.message
            : 'Falha de comunicação com a API.';

      let orientacao = '';

      if (cadastroSalvo) {
        orientacao =
          '\n\nSua conta foi criada. Você pode tentar enviar o PDF novamente.';
      } else if (!apenasDocumento && etapa === 'cadastro') {
        orientacao =
          '\n\nSe a conexão caiu após salvar a conta, use a opção de conta existente.';
      }

      Alert.alert(
        etapa === 'envio'
          ? 'Não foi possível enviar o PDF'
          : 'Não foi possível concluir',
        detalhe + orientacao
      );
    } finally {
      setEnviando(false);
      operacaoEmCurso.current = false;
    }
  }

  if (concluido) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.title}>Comprovante enviado</Text>

        <Text style={styles.description}>
          Seu cadastro está aguardando análise da Prefeitura.
          Entre na sua conta para acompanhar o resultado.
        </Text>

        <Pressable
          style={styles.button}
          onPress={onVoltar}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Ir para o login</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {apenasDocumento ? 'Enviar comprovante' : 'Crie sua conta'}
        </Text>

        <Text style={styles.description}>
          {apenasDocumento
            ? 'Use sua conta existente para enviar o PDF. O cadastro ficará pendente de uma nova análise.'
            : 'Informe seus dados e envie seu comprovante de matrícula em PDF.'}
        </Text>

        {!apenasDocumento && (
          <>
            <Text style={styles.label}>Nome completo</Text>
            <TextInput
              style={styles.input}
              value={nome}
              onChangeText={setNome}
              editable={!ocupado}
              autoCapitalize="words"
              maxLength={150}
              accessibilityLabel="Nome completo"
            />
          </>
        )}

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!ocupado && !contaCriada}
          maxLength={254}
          accessibilityLabel="E-mail"
        />

        {!apenasDocumento && (
          <>
            <Text style={styles.label}>CPF sem pontuação</Text>
            <TextInput
              style={styles.input}
              value={cpf}
              onChangeText={(valor) =>
                setCpf(valor.replace(/\D/g, ''))
              }
              keyboardType="number-pad"
              maxLength={11}
              editable={!ocupado}
              accessibilityLabel="CPF"
            />

            <Text style={styles.label}>Matrícula</Text>
            <TextInput
              style={styles.input}
              value={matricula}
              onChangeText={setMatricula}
              autoCapitalize="none"
              maxLength={30}
              editable={!ocupado}
              accessibilityLabel="Matrícula"
            />
          </>
        )}

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!ocupado}
          accessibilityLabel="Senha"
        />

        {!apenasDocumento && (
          <>
            <Text style={styles.label}>Confirme a senha</Text>
            <TextInput
              style={styles.input}
              value={confirmacaoSenha}
              onChangeText={setConfirmacaoSenha}
              secureTextEntry={!mostrarSenha}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!ocupado}
              accessibilityLabel="Confirmação da senha"
            />
          </>
        )}

        <Pressable
          style={styles.passwordToggle}
          onPress={() => setMostrarSenha(!mostrarSenha)}
          disabled={ocupado}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>
            {mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.secondary, ocupado && styles.disabled]}
          onPress={selecionarPdf}
          disabled={ocupado}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>
            {selecionando
              ? 'Lendo documento...'
              : arquivo
                ? 'Trocar comprovante PDF'
                : 'Selecionar comprovante PDF'}
          </Text>
        </Pressable>

        <Text style={styles.file}>
          {arquivo
            ? `${arquivo.nome} · ${Math.ceil(arquivo.tamanho / 1024)} KB`
            : 'Nenhum arquivo selecionado. Limite: 5 MB.'}
        </Text>

        <Pressable
          style={[styles.button, ocupado && styles.disabled]}
          onPress={cadastrarOuEnviar}
          disabled={ocupado}
          accessibilityRole="button"
          accessibilityState={{
            disabled: ocupado,
            busy: enviando,
          }}
        >
          <Text style={styles.buttonText}>
            {enviando
              ? 'Enviando...'
              : apenasDocumento
                ? 'Enviar comprovante'
                : 'Cadastrar e enviar'}
          </Text>
        </Pressable>

        {!contaCriada && (
          <Pressable
            style={styles.back}
            onPress={alternarModo}
            disabled={ocupado}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>
              {modoReenvio
                ? 'Ainda não tenho conta'
                : 'Já tenho conta e preciso enviar o PDF'}
            </Text>
          </Pressable>
        )}

        <Pressable
          style={styles.back}
          onPress={onVoltar}
          disabled={ocupado}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryText}>Voltar ao login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    paddingHorizontal: 28,
    paddingVertical: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
  },
  label: {
    color: '#334155',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#111827',
    marginBottom: 18,
  },
  passwordToggle: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FACC15',
    padding: 17,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: '#0369A1',
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
  file: {
    color: '#64748B',
    marginTop: 10,
    marginBottom: 24,
  },
  back: {
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});