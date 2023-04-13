#include <bits/stdc++.h>

using namespace std;

int main(void) {
  cout
      << R"({"command":"request","display":"round1","content":{"0":"0","1":"1"}})"
      << endl;
  string s;
  for (int i = 1; i < 50; i++) {
    getline(cin, s);
    cout << R"({"command":"request","display":")" + s +
                R"(","content":{"0":"0","1":"1"}})"
         << endl;
  }
  getline(cin, s);

  cout << R"({"command":"finish","display":"round1","content":{"0":0,"1":0}})"
       << endl;
}