# Requisitos — Capacity view de recursos em projetos

## 1. Contexto e objetivo

Funcionalidade para a área de projetos visualizar, em um único calendário, a alocação de recursos (pessoas) em projetos ao longo do tempo — identificando sobrealocação e capacidade livre sem precisar cruzar planilhas.

## 2. Escopo

Cobre: visualização de capacidade por recurso, registro de alocações a projetos, registro de ausências, cálculo automático de sobrealocação.

Não cobre nesta versão: ver seção 7 (Fora de escopo).

## 3. Requisitos funcionais

| ID | Requisito |
|----|-----------|
| RF01 | O sistema deve exibir uma visão com os recursos (pessoas) nas linhas e o calendário nas colunas. |
| RF02 | Cada alocação de um recurso a um projeto deve ser representada por uma barra que se estende da data de início até a data de fim da alocação. |
| RF03 | A cor da barra deve identificar o projeto (1 projeto = 1 cor), com legenda visível na tela. |
| RF04 | Quando um recurso tiver alocações com períodos sobrepostos, o sistema deve exibi-las em raias separadas dentro da mesma linha, não sobrepostas visualmente. |
| RF05 | O sistema deve sinalizar visualmente quando a soma das alocações confirmadas de um recurso, em um mesmo período, ultrapassar sua jornada padrão (sobrealocação). |
| RF06 | O sistema deve indicar visualmente os períodos em que um recurso está sem alocação (capacidade livre). |
| RF07 | O sistema deve marcar a data atual ("hoje") no calendário. |
| RF08 | A granularidade de exibição (dia, semana ou mês) deve ser configurável sem exigir alteração na forma como as alocações são armazenadas. |
| RF09 | Ao registrar uma alocação, o usuário informa recurso, projeto, data de início, data de fim e horas semanais; o sistema converte esse valor para percentual da jornada do recurso apenas para exibição. |
| RF10 | O sistema deve permitir registrar ausências de um recurso (férias, licença, etc.), que reduzem sua capacidade disponível independentemente de alocação a projetos. |
| RF11 | Toda alocação tem um status — confirmada ou proposta. Apenas alocações confirmadas entram no cálculo de sobrealocação. |
| RF12 | O sistema deve exibir, ao lado de cada recurso, um indicador numérico com o percentual total de carga alocada no período visível. |
| RF13 | O indicador de carga deve ser colorido por faixa: abaixo de 90% (disponível), entre 90% e 100% (próximo do limite), acima de 100% (sobrealocado). |

## 4. Regras de negócio

| ID | Regra |
|----|-------|
| RN01 | Duas alocações se sobrepõem quando `inicio_A <= fim_B` E `fim_A >= inicio_B`. |
| RN02 | Sobrealocação = soma de `horas_semana` das alocações confirmadas de um recurso, em um período, maior que `jornada_padrao_semanal` do recurso. |
| RN03 | O percentual de alocação exibido na tela é sempre calculado (`horas_semana / jornada_padrao_semanal`), nunca armazenado como valor independente — evita divergência entre os dois números. |
| RN04 | Um recurso part-time é representado por uma `jornada_padrao_semanal` menor (ex.: 20h), não por um campo separado. |
| RN05 | As faixas de RF13 usam o mesmo limite de RN02 — o vermelho começa exatamente onde a sobrealocação é detectada, sem um segundo critério divergente. |
| RN08 | A verificação de sobrealocação (RN02) deve considerar o dia como unidade mínima, não apenas a média do período — evita mascarar um pico pontual (ex.: dois dias de alta carga dentro de uma semana que fecha "ok" na média). **Decisão em aberto:** isso exige que `ALOCACAO` capture carga por dia, não só `horas_semana` constante ao longo do período — hoje o modelo assume distribuição uniforme dentro da semana. Vale essa evolução se alocações curtas (1-3 dias) forem comuns; se a maioria for de longa duração, o ganho de precisão é pequeno frente ao custo de mudar o modelo. |
| RN09 | Quando o status de alocação (RF11) for reativado, a diferença visual entre confirmada e proposta deve ser por textura (hachurado diagonal), não por uma segunda cor — a cor já está reservada pra identificar o projeto (RF03). |

## 5. Requisitos não funcionais

| ID | Requisito |
|----|-----------|
| RNF01 | A consulta de sobrealocação deve ter índice em `(recurso_id, data_inicio, data_fim)` — é a consulta executada toda vez que a tela carrega. |
| RNF02 | A interface deve funcionar em modo claro e escuro. |
| RNF03 | Percentuais exibidos devem ser arredondados, sem casas decimais desnecessárias. |

## 6. Modelo de dados (resumo)

| Entidade | Campos principais |
|----------|-------------------|
| `RECURSO` | id, nome, cargo, jornada_padrao_semanal, status |
| `PROJETO` | id, nome, status, data_inicio, data_fim |
| `ALOCACAO` | id, recurso_id (FK), projeto_id (FK), data_inicio, data_fim, horas_semana, status |
| `AUSENCIA` | id, recurso_id (FK), data_inicio, data_fim, tipo |

Relacionamentos: `RECURSO` 1:N `ALOCACAO`; `PROJETO` 1:N `ALOCACAO`; `RECURSO` 1:N `AUSENCIA`.

## 7. Fora de escopo (v1)

- Workflow de aprovação de alocação (proposta → confirmada)
- Notificações automáticas de sobrealocação
- Relatórios de custo ou faturamento baseados em horas alocadas
- Integração com calendários externos (Google Calendar, Outlook)

## 8. Critérios de aceite (exemplos)

**RF05 — Sobrealocação**

```
Dado que um recurso tem jornada padrão de 40h semanais
E está alocado 28h/semana no projeto Atlas, de 01/08 a 30/09
E está alocado 20h/semana no projeto Vega, de 01/09 a 31/12
Quando o sistema calcular a capacidade de setembro
Então a soma (48h) deve ultrapassar a jornada (40h)
E o sistema deve exibir o indicador de sobrealocação nesse período
```

**RF06 — Capacidade livre**

```
Dado que um recurso não possui nenhuma alocação confirmada em outubro
Quando o calendário exibir o mês de outubro para esse recurso
Então a área correspondente deve indicar "livre"
```

**RF09 — Registro com conversão de unidade**

```
Dado um recurso com jornada padrão de 40h semanais
Quando o usuário registrar uma alocação de 20h/semana
Então o sistema deve exibir essa alocação como 50% na visão de capacidade
```

## 9. Escopo do MVP

Um capacity view só entrega valor se mostrar sobrealocação — é o motivo da tela existir, não um extra. O corte abaixo é por custo de construção, não por importância a longo prazo.

### Incluído no MVP

| RF | Por que fica |
|----|---------------|
| RF01 | Estrutura mínima da tela (recursos x calendário) |
| RF02 | O requisito original — barra proporcional ao período |
| RF03 | Sem cor por projeto, a tela não comunica nada |
| RF04 | Sem raias, alocações sobrepostas ficam ilegíveis |
| RF05 | É o motivo da tela existir |
| RF07 | Custo baixo, orienta o usuário no calendário |
| RF09 | Sem cadastro de alocação, não há dado pra mostrar |
| RF12, RF13 | É a mudança mais barata que ataca diretamente "rápido de visualizar" — não exige nova entidade nem lógica além do que RN02 já calcula |

### Cortado do MVP (mover pra v2)

| RF | Por que pode esperar |
|----|------------------------|
| RF06 | Espaço vazio já comunica "livre" — o rótulo é reforço, não essencial |
| RF08 | Fixar uma granularidade única evita construir 3 modos de renderização de uma vez |
| RF10 | Sem ausências, a sobrealocação já funciona — só fica menos precisa |
| RF11 | Sem workflow de aprovação, toda alocação é tratada como confirmada |

### Impacto no modelo de dados

- Tabela `AUSENCIA`: não entra no MVP.
- Campo `ALOCACAO.status`: não entra no MVP — toda alocação é confirmada por padrão.
- Granularidade do calendário: fixa. Recomendo semanal — mensal esconde onde no meio do mês a alocação começa ou termina; diário é granularidade demais pra maioria dos projetos.

### Sinais de que é hora do v2

- Time pede pra distinguir alocação "cotada" de "garantida" → reativa RF11.
- Sobrealocação aparece com frequência porque ninguém registrou férias → reativa RF10.
- Usuários pedem visão diária ou trimestral → reativa RF08.

## 10. Simulador de projetos futuros (feature adicional, fora do MVP)

Permite testar o impacto de um projeto hipotético na carga dos recursos, antes de esse projeto existir de fato — sem gravar nada no banco.

| ID | Requisito |
|----|-----------|
| RF14 | O sistema deve permitir simular o impacto de um projeto hipotético sobre a carga de recursos selecionados, a partir de carga adicional (%) e duração (semanas) informadas pelo usuário. |
| RF15 | O resultado da simulação deve indicar quais recursos selecionados ficariam sobrealocados, com o percentual resultante de cada um. |

| ID | Regra |
|----|-------|
| RN06 | A simulação é efêmera: usa os dados atuais de `RECURSO` e `ALOCACAO` como ponto de partida, calcula em tempo real e não gera nenhum registro persistido. |

**Por que fica fora do MVP:** não é tecnicamente caro (reaproveita RN02), mas é uma camada de valor sobre a visão de capacidade, não a validação do problema central (saber quem está sobrealocado agora). Faz sentido depois que o MVP já estiver em uso e o time confiar no número de carga que ele mostra.

Se no futuro a simulação precisar ser salva pra comparação posterior, aí sim RF11 entra em jogo — sem persistência, isso não se aplica.

## 11. Dashboard de capacidade (feature adicional)

Visão agregada pra leitura rápida — público diferente do capacity view detalhado: gestão/diretoria decidindo se precisa agir, não quem está registrando alocação no dia a dia.

| ID | Requisito |
|----|-----------|
| RF16 | O sistema deve exibir indicadores agregados: utilização média da equipe, quantidade de recursos sobrealocados, e capacidade livre total no período visível. |
| RF17 | O sistema deve exibir a alocação total (horas/semana) por projeto, para leitura de onde a capacidade da equipe está concentrada. |
| RF18 | O sistema deve exibir uma tendência de utilização média projetada para as próximas semanas, calculada a partir das alocações já confirmadas. |

| ID | Regra |
|----|-------|
| RN07 | A tendência de RF18 usa apenas alocações confirmadas (mesmo critério de RN02) — a sobrealocação prevista aqui já é garantida, ao contrário do simulador (seção 10), que parte de dados hipotéticos ainda não registrados. |

**Nota:** RF16-18 reaproveitam as mesmas tabelas e a mesma regra de sobrealocação já definidas — nenhuma entidade nova é necessária. A diferença é o nível de agregação (por equipe/projeto, não por recurso individual) e o público-alvo.

## 12. Visão por projeto (agrupamento alternativo, feature adicional)

Mesmo dado do capacity view, agrupado por projeto em vez de por recurso — útil quando um PM quer ver só a equipe do próprio projeto, sem escanear todos os recursos da área.

| ID | Requisito |
|----|-----------|
| RF19 | O sistema deve permitir alternar o agrupamento da visão de capacidade entre "por recurso" e "por projeto". |
| RF20 | Quando agrupado por projeto, os recursos alocados devem aparecer como sub-linhas dentro do projeto, cada um com sua barra de período e percentual (mesma representação de RF02/RF03). |

**Decisão em aberto:** RF19 pressupõe um toggle que troca a tela inteira. Alternativa: manter "por recurso" como tela principal e tratar "por projeto" como uma tela de detalhe separada (ex.: ao abrir um projeto específico a partir da lista de projetos) — nesse caso não seria um toggle, seria navegação entre duas telas. Depende de como a área de projetos hoje navega entre "meus recursos" e "meu projeto"; vale confirmar com quem for usar antes de implementar.

**Nota:** não exige tabela nova — é uma troca de agrupamento (`GROUP BY recurso_id` vs. `GROUP BY projeto_id`) na mesma consulta de `ALOCACAO`. Mesmo custo de construção baixo de RF08, cortado do MVP pelo mesmo motivo: não é o que valida a hipótese central da tela.
