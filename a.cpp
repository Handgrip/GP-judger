// Tank 裁判程序
// 作者：zhouhy
// https://www.botzone.org.cn/games/Tank

#include "Tools/json.hpp"
#include <cstring>
#include <ctime>
#include <iostream>
#include <set>
#include <stack>
#include <string>
using json = nlohmann::json;

using std::cin;
using std::cout;
using std::endl;
using std::getline;
using std::string;

namespace TankGame {
using std::istream;
using std::set;
using std::stack;

enum GameResult { NotFinished = -2, Draw = -1, Blue = 0, Red = 1 };

enum FieldItem {
  None = 0,
  Brick = 1,
  Steel = 2,
  Base = 4,
  Blue0 = 8,
  Blue1 = 16,
  Red0 = 32,
  Red1 = 64
};

template <typename T> inline T operator~(T a) { return (T) ~(int)a; }
template <typename T> inline T operator|(T a, T b) {
  return (T)((int)a | (int)b);
}
template <typename T> inline T operator&(T a, T b) {
  return (T)((int)a & (int)b);
}
template <typename T> inline T operator^(T a, T b) {
  return (T)((int)a ^ (int)b);
}
template <typename T> inline T &operator|=(T &a, T b) {
  return (T &)((int &)a |= (int)b);
}
template <typename T> inline T &operator&=(T &a, T b) {
  return (T &)((int &)a &= (int)b);
}
template <typename T> inline T &operator^=(T &a, T b) {
  return (T &)((int &)a ^= (int)b);
}

enum Action {
  Invalid = -2,
  Stay = -1,
  Up,
  Right,
  Down,
  Left,
  UpShoot,
  RightShoot,
  DownShoot,
  LeftShoot
};

// 坐标左上角为原点（0, 0），x 轴向右延伸，y 轴向下延伸
// Side（对战双方） - 0 为蓝，1 为红
// Tank（每方的坦克） - 0 为 0 号坦克，1 为 1 号坦克
// Turn（回合编号） - 从 1 开始

const int fieldHeight = 9, fieldWidth = 9, sideCount = 2, tankPerSide = 2;

// 基地的横坐标
const int baseX[sideCount] = {fieldWidth / 2, fieldWidth / 2};

// 基地的纵坐标
const int baseY[sideCount] = {0, fieldHeight - 1};

const int dx[4] = {0, 1, 0, -1}, dy[4] = {-1, 0, 1, 0};
const FieldItem tankItemTypes[sideCount][tankPerSide] = {{Blue0, Blue1},
                                                         {Red0, Red1}};

int maxTurn = 100;

inline bool ActionIsMove(Action x) { return x >= Up && x <= Left; }

inline bool ActionIsShoot(Action x) { return x >= UpShoot && x <= LeftShoot; }

inline bool ActionDirectionIsOpposite(Action a, Action b) {
  return a >= Up && b >= Up && (a + 2) % 4 == b % 4;
}

inline bool CoordValid(int x, int y) {
  return x >= 0 && x < fieldWidth && y >= 0 && y < fieldHeight;
}

// 判断 item 是不是叠在一起的多个坦克
inline bool HasMultipleTank(FieldItem item) {
  // 如果格子上只有一个物件，那么 item 的值是 2 的幂或 0
  // 对于数字 x，x & (x - 1) == 0 当且仅当 x 是 2 的幂或 0
  return !!(item & (item - 1));
}

inline int GetTankSide(FieldItem item) {
  return item == Blue0 || item == Blue1 ? Blue : Red;
}

inline int GetTankID(FieldItem item) {
  return item == Blue0 || item == Red0 ? 0 : 1;
}

// 获得动作的方向
inline int ExtractDirectionFromAction(Action x) {
  if (x >= Up)
    return x % 4;
  return -1;
}

// 物件消失的记录，用于回退
struct DisappearLog {
  FieldItem item;

  // 导致其消失的回合的编号
  int turn;

  int x, y;
  bool operator<(const DisappearLog &b) const {
    if (x == b.x) {
      if (y == b.y)
        return item < b.item;
      return y < b.y;
    }
    return x < b.x;
  }
};

class TankField {
public:
  //!//!//!// 以下变量设计为只读，不推荐进行修改 //!//!//!//

  // 游戏场地上的物件（一个格子上可能有多个坦克）
  FieldItem gameField[fieldHeight][fieldWidth] = {};

  // 坦克是否存活
  bool tankAlive[sideCount][tankPerSide] = {{true, true}, {true, true}};

  // 基地是否存活
  bool baseAlive[sideCount] = {true, true};

  // 坦克横坐标，-1表示坦克已炸
  int tankX[sideCount][tankPerSide] = {
      {fieldWidth / 2 - 2, fieldWidth / 2 + 2},
      {fieldWidth / 2 + 2, fieldWidth / 2 - 2}};

  // 坦克纵坐标，-1表示坦克已炸
  int tankY[sideCount][tankPerSide] = {{0, 0},
                                       {fieldHeight - 1, fieldHeight - 1}};

  // 当前回合编号
  int currentTurn = 0;

  // 我是哪一方
  int mySide;

  // 用于回退的log
  stack<DisappearLog> logs;

  // 过往动作（previousActions[x] 表示所有人在第 x 回合的动作，第 0
  // 回合的动作没有意义）
  Action previousActions[101][sideCount][tankPerSide] = {
      {{Stay, Stay}, {Stay, Stay}}};

  //!//!//!// 以上变量设计为只读，不推荐进行修改 //!//!//!//

  // 本回合双方即将执行的动作，需要手动填入
  Action nextAction[sideCount][tankPerSide] = {{Invalid, Invalid},
                                               {Invalid, Invalid}};

  // 判断行为是否合法（出界或移动到非空格子算作非法）
  // 未考虑坦克是否存活
  bool ActionIsValid(int side, int tank, Action act) {
    if (act == Invalid)
      return false;
    if (act > Left &&
        previousActions[currentTurn - 1][side][tank] > Left) // 连续两回合射击
      return false;
    if (act == Stay || act > Left)
      return true;
    int x = tankX[side][tank] + dx[act], y = tankY[side][tank] + dy[act];
    return CoordValid(x, y) && gameField[y][x] == None;
  }

  // 判断 nextAction 中的所有行为是否都合法
  // 忽略掉未存活的坦克
  bool ActionIsValid() {
    for (int side = 0; side < sideCount; side++)
      for (int tank = 0; tank < tankPerSide; tank++)
        if (tankAlive[side][tank] &&
            !ActionIsValid(side, tank, nextAction[side][tank]))
          return false;
    return true;
  }

private:
  void _destroyTank(int side, int tank) {
    tankAlive[side][tank] = false;
    tankX[side][tank] = tankY[side][tank] = -1;
  }

public:
  // 执行 nextAction 中指定的行为并进入下一回合，返回行为是否合法
  bool DoAction() {
    if (!ActionIsValid())
      return false;

    // 1 移动
    for (int side = 0; side < sideCount; side++)
      for (int tank = 0; tank < tankPerSide; tank++) {
        Action act = nextAction[side][tank];

        // 保存动作
        previousActions[currentTurn][side][tank] = act;
        if (tankAlive[side][tank] && ActionIsMove(act)) {
          int &x = tankX[side][tank], &y = tankY[side][tank];
          FieldItem &items = gameField[y][x];

          // 记录 Log
          DisappearLog log;
          log.x = x;
          log.y = y;
          log.item = tankItemTypes[side][tank];
          log.turn = currentTurn;
          logs.push(log);

          // 变更坐标
          x += dx[act];
          y += dy[act];

          // 更换标记（注意格子可能有多个坦克）
          gameField[y][x] |= log.item;
          items &= ~log.item;
        }
      }

    // 2 射♂击
    set<DisappearLog> itemsToBeDestroyed;
    for (int side = 0; side < sideCount; side++)
      for (int tank = 0; tank < tankPerSide; tank++) {
        Action act = nextAction[side][tank];
        if (tankAlive[side][tank] && ActionIsShoot(act)) {
          int dir = ExtractDirectionFromAction(act);
          int x = tankX[side][tank], y = tankY[side][tank];
          bool hasMultipleTankWithMe = HasMultipleTank(gameField[y][x]);
          while (true) {
            x += dx[dir];
            y += dy[dir];
            if (!CoordValid(x, y))
              break;
            FieldItem items = gameField[y][x];
            if (items != None) {
              // 对射判断
              if (items >= Blue0 && !hasMultipleTankWithMe &&
                  !HasMultipleTank(items)) {
                // 自己这里和射到的目标格子都只有一个坦克
                Action theirAction =
                    nextAction[GetTankSide(items)][GetTankID(items)];
                if (ActionIsShoot(theirAction) &&
                    ActionDirectionIsOpposite(act, theirAction)) {
                  // 而且我方和对方的射击方向是反的
                  // 那么就忽视这次射击
                  break;
                }
              }

              // 标记这些物件要被摧毁了（防止重复摧毁）
              for (int mask = 1; mask <= Red1; mask <<= 1)
                if (items & mask) {
                  DisappearLog log;
                  log.x = x;
                  log.y = y;
                  log.item = (FieldItem)mask;
                  log.turn = currentTurn;
                  itemsToBeDestroyed.insert(log);
                }
              break;
            }
          }
        }
      }

    for (auto &log : itemsToBeDestroyed) {
      switch (log.item) {
      case Base: {
        int side = log.x == baseX[Blue] && log.y == baseY[Blue] ? Blue : Red;
        baseAlive[side] = false;
        break;
      }
      case Blue0:
        _destroyTank(Blue, 0);
        break;
      case Blue1:
        _destroyTank(Blue, 1);
        break;
      case Red0:
        _destroyTank(Red, 0);
        break;
      case Red1:
        _destroyTank(Red, 1);
        break;
      case Steel:
        continue;
      default:;
      }
      gameField[log.y][log.x] &= ~log.item;
      logs.push(log);
    }

    for (int side = 0; side < sideCount; side++)
      for (int tank = 0; tank < tankPerSide; tank++)
        nextAction[side][tank] = Invalid;

    return true;
  }

  // 游戏是否结束？谁赢了？
  GameResult GetGameResult() {
    bool fail[sideCount] = {};
    for (int side = 0; side < sideCount; side++)
      if ((!tankAlive[side][0] && !tankAlive[side][1]) || !baseAlive[side])
        fail[side] = true;
    if (fail[0] == fail[1])
      return fail[0] || currentTurn > maxTurn ? Draw : NotFinished;
    if (fail[Blue])
      return Red;
    return Blue;
  }

  // 三个 int 表示场地 01 矩阵（每个 int 用 27 位表示 3 行）
  TankField(int hasBrick[3], int mySide) : mySide(mySide) {
    for (int i = 0; i < 3; i++) {
      int mask = 1;
      for (int y = i * 3; y < (i + 1) * 3; y++) {
        for (int x = 0; x < fieldWidth; x++) {
          if (hasBrick[i] & mask)
            gameField[y][x] = Brick;
          mask <<= 1;
        }
      }
    }
    for (int side = 0; side < sideCount; side++) {
      for (int tank = 0; tank < tankPerSide; tank++)
        gameField[tankY[side][tank]][tankX[side][tank]] =
            tankItemTypes[side][tank];
      gameField[baseY[side]][baseX[side]] = Base;
    }
    gameField[baseY[0] + 1][baseX[0]] = gameField[baseY[1] - 1][baseX[1]] =
        Steel;
  }

  // 打印场地
  void DebugPrint() {
    // #ifndef _BOTZONE_ONLINE
    //     const string side2String[] = {"蓝", "红"};
    //     const string boolean2String[] = {"已炸", "存活"};
    //     const char *boldHR = "==============================";
    //     const char *slimHR = "------------------------------";
    //     cout << boldHR << endl
    //          << "图例：" << endl
    //          << ". - 空\t# - 砖\t% - 钢\t* - 基地\t@ - 多个坦克" << endl
    //          << "b - 蓝0\tB - 蓝1\tr - 红0\tR - 红1" << endl
    //          << slimHR << endl;
    //     for (int y = 0; y < fieldHeight; y++) {
    //       for (int x = 0; x < fieldWidth; x++) {
    //         switch (gameField[y][x]) {
    //         case None:
    //           cout << '.';
    //           break;
    //         case Brick:
    //           cout << '#';
    //           break;
    //         case Steel:
    //           cout << '%';
    //           break;
    //         case Base:
    //           cout << '*';
    //           break;
    //         case Blue0:
    //           cout << 'b';
    //           break;
    //         case Blue1:
    //           cout << 'B';
    //           break;
    //         case Red0:
    //           cout << 'r';
    //           break;
    //         case Red1:
    //           cout << 'R';
    //           break;
    //         default:
    //           cout << '@';
    //           break;
    //         }
    //       }
    //       cout << endl;
    //     }
    //     cout << slimHR << endl;
    //     for (int side = 0; side < sideCount; side++) {
    //       cout << side2String[side] << "：基地" <<
    //       boolean2String[baseAlive[side]]; for (int tank = 0; tank <
    //       tankPerSide; tank++)
    //         cout << ", 坦克" << tank <<
    //         boolean2String[tankAlive[side][tank]];
    //       cout << endl;
    //     }
    //     cout << "当前回合：" << currentTurn << "，";
    //     GameResult result = GetGameResult();
    //     if (result == -2)
    //       cout << "游戏尚未结束" << endl;
    //     else if (result == -1)
    //       cout << "游戏平局" << endl;
    //     else
    //       cout << side2String[result] << "方胜利" << endl;
    //     cout << boldHR << endl;
    // #endif
  }

  bool operator!=(const TankField &b) const {

    for (int y = 0; y < fieldHeight; y++)
      for (int x = 0; x < fieldWidth; x++)
        if (gameField[y][x] != b.gameField[y][x])
          return true;

    for (int side = 0; side < sideCount; side++)
      for (int tank = 0; tank < tankPerSide; tank++) {
        if (tankX[side][tank] != b.tankX[side][tank])
          return true;
        if (tankY[side][tank] != b.tankY[side][tank])
          return true;
        if (tankAlive[side][tank] != b.tankAlive[side][tank])
          return true;
      }

    if (baseAlive[0] != b.baseAlive[0] || baseAlive[1] != b.baseAlive[1])
      return true;

    if (currentTurn != b.currentTurn)
      return true;

    return false;
  }
};

TankField *field;

} // namespace TankGame

namespace TankJudge {
using namespace TankGame;

int fieldBinary[3];

bool visited[fieldHeight][fieldWidth];

void InitializeField() {
  memset(visited, 0, sizeof(visited));
  bool hasBrick[fieldHeight][fieldWidth] = {};

  int portionH = (fieldHeight + 1) / 2;

  for (int y = 0; y < portionH; y++)
    for (int x = 0; x < fieldWidth; x++)
      hasBrick[y][x] = rand() % 3 > 1;

  int bx = baseX[0], by = baseY[0];
  hasBrick[by + 1][bx + 1] = hasBrick[by + 1][bx - 1] = hasBrick[by][bx + 1] =
      hasBrick[by][bx - 1] = true;
  hasBrick[by][bx] = hasBrick[by + 1][bx] = hasBrick[by][bx + 2] =
      hasBrick[by][bx - 2] = false;

  for (int y = 0; y < portionH; y++)
    for (int x = 0; x < fieldWidth; x++)
      hasBrick[fieldHeight - y - 1][fieldWidth - x - 1] = hasBrick[y][x];

  for (int y = 2; y < fieldHeight - 2; y++)
    hasBrick[y][fieldWidth / 2] = true;
  for (int x = 0; x < fieldWidth; x++)
    hasBrick[fieldHeight / 2][x] = true;

  for (int i = 0; i < 3; i++) {
    int mask = 1;
    for (int y = i * 3; y < (i + 1) * 3; y++) {
      for (int x = 0; x < fieldWidth; x++) {
        if (hasBrick[y][x])
          fieldBinary[i] |= mask;
        mask <<= 1;
      }
    }
  }
}
} // namespace TankJudge

int main() {
  unsigned int seed;
  const string int2str[] = {"0", "1"};

  json output;

  srand(seed = time(nullptr));

  TankJudge::InitializeField();

  TankGame::field = new TankGame::TankField(TankJudge::fieldBinary, 0);

  for (int side = 0; side < TankGame::sideCount; side++) {
    std::stringstream ss;
    for (int i = 0; i < 3; i++) {
      ss << (i == 0 ? "" : " ") << TankJudge::fieldBinary[i];
    }
    output["content"][int2str[side]] = ss.str();
  }

  output["command"] = "request";
  output["display"] = json(std::vector(std::begin(TankJudge::fieldBinary),
                                       std::end(TankJudge::fieldBinary)))
                          .dump();
  cout << output << std::endl;
  TankGame::field->DebugPrint();

  bool invalid[TankGame::sideCount] = {};
  auto setWinner = [&](int to) {
    if (to == -1)
      output["content"]["0"] = output["content"]["1"] = 1;
    else if (to == 1) {
      output["content"]["0"] = 0;
      output["content"]["1"] = 2;
    } else {
      output["content"]["0"] = 2;
      output["content"]["1"] = 0;
    }
  };
  for (;;) {
    TankGame::field->currentTurn++;
    output = json();
    output["command"] = "request";
    json to_judger;
    cin >> to_judger;
    int result = -2;
    for (int side = 0; side < TankGame::sideCount; side++) {
      json response = to_judger[int2str[side]];
      string raw = response["raw"].get<string>();
      TankGame::Action act0, act1;
      int i0, i1;
      std::stringstream ss;
      ss << raw;
      ss >> i0 >> i1;
      act0 = (TankGame::Action)i0;
      act1 = (TankGame::Action)i1;

      if (!TankGame::field->tankAlive[side][0] ||
          !TankGame::field->ActionIsValid(side, 0, act0))
        act0 = TankGame::Action::Invalid;
      if (!TankGame::field->tankAlive[side][1] ||
          !TankGame::field->ActionIsValid(side, 1, act1))
        act1 = TankGame::Action::Invalid;

      string action = std::to_string(act0) + " " + std::to_string(act1);
      output["display"][int2str[side]] = output["content"][int2str[1 - side]] =
          action;

      if ((!TankGame::field->tankAlive[side][0] ||
           TankGame::field->ActionIsValid(side, 0, act0)) &&
          (!TankGame::field->tankAlive[side][1] ||
           TankGame::field->ActionIsValid(side, 1, act1))) {
        TankGame::field->nextAction[side][0] = act0;
        TankGame::field->nextAction[side][1] = act1;
        continue;
      }

      invalid[side] = true;
      output["display"]["loseReason"][side] =
          "INVALID_INPUT_VERDICT_" + response["verdict"].get<string>();
    }
    if (invalid[0] || invalid[1]) {
      output["command"] = "finish";
      if (invalid[0] == invalid[1])
        setWinner(-1);
      else if (invalid[0])
        setWinner(1);
      else
        setWinner(0);
      goto ed;
    }

    TankGame::field->DoAction();

    result = TankGame::field->GetGameResult();
    if (result != -2) {
      output["command"] = "finish";
      setWinner(result);
      for (int side = 0; side < TankGame::sideCount; side++) {
        bool tankExist = TankGame::field->tankAlive[side][0] ||
                         TankGame::field->tankAlive[side][1];
        bool baseExist = TankGame::field->baseAlive[side];
        if (!tankExist && !baseExist)
          output["display"]["loseReason"][side] = "BASE_TANK_ALL_DESTROYED";
        else if (!tankExist)
          output["display"]["loseReason"][side] = "TANK_ALL_DESTROYED";
        else if (!baseExist)
          output["display"]["loseReason"][side] = "BASE_DESTROYED";
      }
      goto ed;
    }
  ed:;
    output["display"] = output["display"].dump();
    cout << output << endl;
    TankGame::field->DebugPrint();
    if (output["command"] == "finish") {
      break;
    }
  }
}