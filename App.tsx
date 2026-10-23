import { useState } from 'react';
import Cadastro from './Cadastro';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const API_URL = 'http://127.0.0.1:8000';

type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  status: string;
};

type Sessao = {
  access_token: string;
  usuario: Usuario;
};

function usuarioValido(valor: unknown): valor is Usuario {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }

  const usuario = valor as Record<string, unknown>;

  return (
    typeof usuario.id === 'number' &&
    typeof usuario.nome === 'string' &&
    typeof usuario.email === 'string' &&
    typeof usuario.perfil === 'string' &&
    typeof usuario.status === 'string'
  );
}

function sessaoValida(valor: unknown): valor is Sessao {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }

  const dados = valor as Record<string, unknown>;

  return (
    typeof dados.access_token === 'string' &&
    dados.access_token.length > 0 &&
    usuarioValido(dados.usuario)
  );
}

export default function App() {
  const [telaCadastro, setTelaCadastro] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [sessao, setSessao] = useState<Sessao | null>(null);

  async function entrar() {
    if (carregando) return;

    if (!email.trim() || !senha) {
      Alert.alert(
        'Preencha os campos',
        'Informe seu e-mail e sua senha.'
      );
      return;
    }

    setCarregando(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resposta = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          senha,
        }),
        signal: controller.signal,
      });

      if (!resposta.ok) {
        let mensagem =
          'O servidor apresentou um erro. Tente novamente.';

        if (resposta.status === 401) {
          mensagem = 'E-mail ou senha incorretos.';
        } else if (resposta.status === 422) {
          mensagem = 'Confira o formato do e-mail e da senha.';
        }

        Alert.alert('Não foi possível entrar', mensagem);
        return;
      }

      const dados: unknown = await resposta.json();

      if (!sessaoValida(dados)) {
        Alert.alert(
          'Resposta inválida',
          'A API retornou dados de login inesperados.'
        );
        return;
      }

      setSessao(dados);
      setSenha('');
      setMostrarSenha(false);
    } catch {
      Alert.alert(
        'Falha de conexão',
        'Confira se a API está aberta e se a porta 8000 foi conectada ao emulador.'
      );
    } finally {
      clearTimeout(timeout);
      setCarregando(false);
    }
  }

  async function atualizarStatus() {
    if (!sessao || atualizando) return;

    const tokenAtual = sessao.access_token;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    setAtualizando(true);

    try {
      const resposta = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${tokenAtual}`,
        },
        signal: controller.signal,
      });

      if (resposta.status === 401 || resposta.status === 403) {
        setSessao(null);
        setSenha('');

        Alert.alert(
          'Sessão encerrada',
          'Entre novamente para continuar.'
        );
        return;
      }

      if (!resposta.ok) {
        Alert.alert(
          'Não foi possível atualizar',
          'Tente novamente em alguns instantes.'
        );
        return;
      }

      const dados: unknown = await resposta.json();

      if (!usuarioValido(dados)) {
        Alert.alert(
          'Resposta inválida',
          'A API retornou dados de usuário inesperados.'
        );
        return;
      }

      setSessao((anterior) => {
        if (!anterior || anterior.access_token !== tokenAtual) {
          return anterior;
        }

        return {
          ...anterior,
          usuario: dados,
        };
      });
    } catch {
      Alert.alert(
        'Falha de conexão',
        'Não foi possível consultar seu cadastro.'
      );
    } finally {
      clearTimeout(timeout);
      setAtualizando(false);
    }
  }

  function sair() {
    setSessao(null);
    setSenha('');
    setMostrarSenha(false);
  }

  if (telaCadastro) {
    return <Cadastro onVoltar={() => setTelaCadastro(false)} />;
  }

  if (sessao) {
    const { usuario } = sessao;

    const nomesPerfil: Record<string, string> = {
      aluno: 'Aluno',
      motorista: 'Motorista',
      agente: 'Agente da Prefeitura',
    };

    const nomesStatus: Record<string, string> = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado',
    };

    const descricoesStatus: Record<string, string> = {
      pendente: 'Seu cadastro está aguardando aprovação.',
      aprovado: 'Seu cadastro foi aprovado.',
      rejeitado:
        'Seu cadastro foi rejeitado. Entre em contato com a gestão.',
    };

    return (
      <View style={styles.container}>
        <StatusBar style="dark" />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.brand}>
            <View style={styles.symbol}>
              <Text style={styles.symbolText}>OU</Text>
            </View>

            <Text style={styles.brandName}>OUniníbus</Text>
            <Text style={styles.subtitle}>
              Seu caminho para a universidade.
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.title}>
              Olá, {usuario.nome}!
            </Text>

            <Text style={styles.description}>
              Você está conectado à sua conta.
            </Text>

            <View style={styles.profile}>
              <Text style={styles.label}>E-mail</Text>
              <Text style={styles.profileValue}>
                {usuario.email}
              </Text>

              <Text style={styles.label}>Perfil</Text>
              <Text style={styles.profileValue}>
                {nomesPerfil[usuario.perfil] ?? usuario.perfil}
              </Text>

              <Text style={styles.label}>
                Status do cadastro
              </Text>
              <Text style={styles.statusText}>
                {nomesStatus[usuario.status] ?? usuario.status}
              </Text>

              <Text style={styles.statusDescription}>
                {descricoesStatus[usuario.status] ??
                  'Consulte a gestão para mais informações.'}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.pressed,
                atualizando && styles.disabled,
              ]}
              onPress={() => {
                void atualizarStatus();
              }}
              disabled={atualizando}
              accessibilityRole="button"
              accessibilityState={{
                disabled: atualizando,
                busy: atualizando,
              }}
            >
              <Text style={styles.buttonText}>
                {atualizando
                  ? 'Atualizando...'
                  : 'Atualizar status'}
              </Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
                atualizando && styles.disabled,
              ]}
              onPress={sair}
              disabled={atualizando}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>
                Sair
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <View style={styles.symbol}>
            <Text style={styles.symbolText}>OU</Text>
          </View>

          <Text style={styles.brandName}>OUniníbus</Text>

          <Text style={styles.subtitle}>
            Seu caminho para a universidade.
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Acesse sua conta</Text>

          <Text style={styles.description}>
            Entre para acompanhar seu transporte universitário.
          </Text>

          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor="#6B7280"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            accessibilityLabel="E-mail"
            editable={!carregando}
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Senha</Text>
          <TextInput
            style={styles.input}
            placeholder="Digite sua senha"
            placeholderTextColor="#6B7280"
            secureTextEntry={!mostrarSenha}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            accessibilityLabel="Senha"
            editable={!carregando}
            value={senha}
            onChangeText={setSenha}
            onSubmitEditing={() => {
              void entrar();
            }}
            returnKeyType="go"
          />

          <Pressable
            style={styles.secondaryButton}
            onPress={() => setTelaCadastro(true)}
            disabled={carregando}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Criar conta de aluno</Text>
          </Pressable>

          <Pressable
            style={styles.showPassword}
            onPress={() => setMostrarSenha(!mostrarSenha)}
            disabled={carregando}
            accessibilityRole="button"
          >
            <Text style={styles.link}>
              {mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              carregando && styles.disabled,
            ]}
            onPress={() => {
              void entrar();
            }}
            disabled={carregando}
            accessibilityRole="button"
            accessibilityState={{
              disabled: carregando,
              busy: carregando,
            }}
          >
            <Text style={styles.buttonText}>
              {carregando ? 'Entrando...' : 'Entrar'}
            </Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          Transporte universitário com mais organização.
        </Text>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 64,
  },
  brand: {
    alignItems: 'center',
    marginBottom: 40,
  },
  symbol: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  symbolText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  title: {
    fontSize: 25,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
    marginBottom: 28,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: '#111827',
    marginBottom: 18,
  },
  showPassword: {
    alignSelf: 'flex-end',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 18,
  },
  link: {
    color: '#0369A1',
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#FACC15',
    borderRadius: 12,
    padding: 17,
    alignItems: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  profile: {
    marginBottom: 28,
  },
  profileValue: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 22,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#64748B',
    marginTop: 40,
  },
});