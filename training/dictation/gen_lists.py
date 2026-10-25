import random, json, csv
random.seed(7)
groceries=["eggs","mango","milk","bread","butter","paneer","tomatoes","onions","rice","atta","curd","bananas","coffee","green tea","peanut butter","chocolate","strawberries","oats","spinach","dal"]
packing=["charger","passport","laptop","toothbrush","sunscreen","headphones","two t-shirts","jacket","wallet","power bank"]
tasks=["reply to Neha","fix the login bug","send the invoice","book the cab","call Mom","update the deck","review the pull request","pay the electricity bill","post on LinkedIn","clean the inbox"]
people=["Riya","Arjun","Neha","Kabir","Divya","Rohan"]
def cap(s): return s[0].upper()+s[1:]
def bul(items): return "\n".join("- "+cap(x) for x in items)
def num(items): return "\n".join(f"{i+1}. {cap(x)}" for i,x in enumerate(items))
ex=[]
# explicit list intro -> bullets
intros=[("i have to go to the grocery store to get the following things","I have to go to the grocery store to get the following things:"),
("i need to buy these things","I need to buy these things:"),
("my shopping list is","My shopping list:"),
("grocery list","Grocery list:"),
("things to pack for goa","Things to pack for Goa:"),
("dont forget to bring","Don't forget to bring:"),
("here's what we need for the party","Here's what we need for the party:"),
("todays to do list","Today's to-do list:"),
("stuff i need from the market","Stuff I need from the market:")]
for _ in range(60):
    a,b=random.choice(intros)
    pool=packing if "pack" in a or "bring" in a else tasks if "to do" in a else groceries
    items=random.sample(pool,random.randint(3,6))
    spoken=a+" "+" ".join(items[:-1])+(" and " if random.random()<.6 else " ")+items[-1]
    if random.random()<.3: spoken="okay so "+spoken
    ex.append(("lists_bullet",spoken,b+"\n"+bul(items)))
# order / steps -> numbered
sintros=[("the steps are","The steps are:"),("to set it up first","To set it up:"),("here's the plan for tomorrow first","Here's the plan for tomorrow:"),("my priorities today are one","My priorities today:"),("the process is first","The process:")]
for _ in range(45):
    a,b=random.choice(sintros)
    items=random.sample(tasks,random.randint(3,5))
    if "one" in a: words=["","two","three","four","five"]; spoken=a+" "+items[0]+" "+" ".join(f"{words[i]} {items[i]}" for i in range(1,len(items)))
    elif "first" in a: spoken=a+" "+items[0]+" then "+" then ".join(items[1:-1])+(" and finally " if len(items)>2 else " ")+items[-1]
    else: spoken=a+" first "+items[0]+" second "+" third ".join(items[1:])
    spoken=spoken.replace("  "," ")
    ex.append(("lists_numbered",spoken,b+"\n"+num(items)))
# short inline -> sentence
for _ in range(40):
    p=random.choice(people)
    items=random.sample(groceries,random.randint(2,3))
    lst=items[0]+" and "+items[1] if len(items)==2 else f"{items[0]}, {items[1]}, and {items[2]}"
    t=random.choice([("can you pick up {s} on your way home","Can you pick up {l} on your way home?"),("tell {p} to get {s}","Tell {p} to get {l}."),("i had {s} for breakfast","I had {l} for breakfast."),("we're out of {s}","We're out of {l}.")])
    spoken=t[0].format(s=" ".join(items[:-1])+" and "+items[-1],p=p.lower()); out=t[1].format(l=lst,p=p)
    ex.append(("lists_inline",spoken,out))
random.shuffle(ex)
test=ex[:36]; train=ex[36:]
ej="../../supabase/functions/voice/dictation-refine/examples.json"
E0=[e for e in json.load(open(ej)) if not e["c"].startswith("lists_")]
json.dump(E0+[{"c":c,"i":i,"o":o} for c,i,o in train],open(ej,"w"),ensure_ascii=False)
with open("test-lists.csv","w",newline="") as f:
    w=csv.writer(f); w.writerow(["id","category","input","output"])
    for n,(c,i,o) in enumerate(test): w.writerow([9000+n,c,i,o])
print(len(train),len(test),len(E0))
